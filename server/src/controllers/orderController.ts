import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuditService } from '../services/auditService';
import { AuthenticatedRequest } from '../types';

export const createOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  employeeId: z.string().optional(),
  amount: z.number().positive('Amount must be greater than 0'),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED']).default('PENDING'),
  notes: z.string().optional(),
});

export const updateOrderSchema = z.object({
  amount: z.number().positive().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED']).optional(),
  employeeId: z.string().optional(),
  notes: z.string().optional().nullable(),
  version: z.number().int().min(1, 'Version number is required for concurrency control'),
  forceOverwrite: z.boolean().optional().default(false),
});

export const getOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    search,
    status,
    paymentStatus,
    customerId,
    employeeId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = '1',
    limit = '15',
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const where: any = {};

  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (customerId) where.customerId = customerId;
  if (employeeId) where.employeeId = employeeId;

  // If Executive, limit to assigned orders
  if (req.user?.role === 'EXECUTIVE') {
    where.employeeId = req.user.id;
  }

  if (search) {
    const s = search.trim();
    where.OR = [
      { orderNumber: { contains: s } },
      { customer: { name: { contains: s } } },
      { customer: { code: { contains: s } } },
    ];
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
      take,
      skip: (pageNum - 1) * take,
      include: {
        customer: { select: { id: true, code: true, name: true, email: true } },
        employee: { select: { id: true, fullName: true, email: true } },
        payments: {
          select: { id: true, paymentNumber: true, amount: true, createdAt: true },
        },
      },
    }),
  ]);

  res.json({
    success: true,
    data: orders,
    meta: {
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  });
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, code: true, name: true, email: true, phone: true } },
      employee: { select: { id: true, fullName: true, email: true } },
      payments: {
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, fullName: true } },
        },
      },
    },
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' });
    return;
  }

  // IDOR check for Executive
  if (req.user?.role === 'EXECUTIVE' && order.employeeId !== req.user.id) {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'You are not assigned to this order.',
    });
    return;
  }

  const activityLogs = await prisma.auditLog.findMany({
    where: { entityType: 'ORDER', entityId: id },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, order, activityLogs });
};

export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const data = req.body;

  const count = await prisma.order.count();
  const orderNumber = `ORD-${1000 + count + 1}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: data.customerId,
      employeeId: data.employeeId || req.user?.id,
      amount: data.amount,
      status: data.status || 'PENDING',
      notes: data.notes,
      version: 1, // Start with version 1
    },
    include: {
      customer: { select: { code: true, name: true } },
      employee: { select: { fullName: true } },
    },
  });

  await AuditService.log({
    user: req.user,
    entityType: 'ORDER',
    entityId: order.id,
    action: 'CREATE',
    summary: `${req.user?.fullName} created order ${order.orderNumber} for ₹${order.amount.toLocaleString('en-IN')}`,
    details: { amount: order.amount, customer: order.customer.name },
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, order });
};

/**
 * Update Order with Optimistic Concurrency Control (OCC)
 *
 * Prevents the classic lost-update anomaly:
 * If Employee A modifies ₹50,000 -> ₹55,000 (incrementing version from 1 to 2),
 * and Employee B submits an edit to ₹60,000 using version 1,
 * Employee B will receive a 409 CONCURRENCY_CONFLICT with the latest record.
 */
export const updateOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { amount, status, employeeId, notes, version, forceOverwrite } = req.body;

  const existing = await prisma.order.findUnique({
    where: { id },
    include: {
      employee: { select: { fullName: true } },
      customer: { select: { name: true } },
    },
  });

  if (!existing) {
    res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Order not found' });
    return;
  }

  // IDOR check for Executive
  if (req.user?.role === 'EXECUTIVE' && existing.employeeId !== req.user.id) {
    res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Unauthorized to modify this order' });
    return;
  }

  // Optimistic Concurrency Control Check:
  // If version doesn't match and not forceOverwrite, abort with 409 Conflict!
  if (existing.version !== version && !forceOverwrite) {
    await AuditService.log({
      user: req.user,
      entityType: 'ORDER',
      entityId: id,
      action: 'CONFLICT_DETECTED',
      summary: `Concurrency conflict on Order ${existing.orderNumber}: ${req.user?.fullName} attempted update using stale version ${version}, current is ${existing.version}`,
      details: {
        staleVersion: version,
        currentVersion: existing.version,
        attemptedAmount: amount,
        currentAmount: existing.amount,
      },
      ipAddress: req.ip,
    });

    res.status(409).json({
      success: false,
      error: 'CONCURRENCY_CONFLICT',
      message: `Conflict detected: Order ${existing.orderNumber} was modified by another user while you were editing.`,
      conflict: {
        orderId: existing.id,
        orderNumber: existing.orderNumber,
        currentAmount: existing.amount,
        currentStatus: existing.status,
        currentVersion: existing.version,
        submittedVersion: version,
        submittedAmount: amount,
        lastUpdatedAt: existing.updatedAt,
      },
    });
    return;
  }

  const updateData: any = {
    version: { increment: 1 },
  };

  if (amount !== undefined) updateData.amount = amount;
  if (status !== undefined) updateData.status = status;
  if (employeeId !== undefined) updateData.employeeId = employeeId;
  if (notes !== undefined) updateData.notes = notes;

  const updated = await prisma.order.update({
    where: { id },
    data: updateData,
    include: {
      customer: { select: { code: true, name: true } },
      employee: { select: { fullName: true } },
    },
  });

  // Build descriptive audit log
  let summary = `${req.user?.fullName} updated order ${updated.orderNumber}`;
  if (amount !== undefined && amount !== existing.amount) {
    // Example: "Rahul updated order: ₹50,000 → ₹55,000"
    summary = `${req.user?.fullName} updated order ${updated.orderNumber}: ₹${existing.amount.toLocaleString('en-IN')} → ₹${updated.amount.toLocaleString('en-IN')}`;
  } else if (status !== undefined && status !== existing.status) {
    summary = `${req.user?.fullName} changed order ${updated.orderNumber} status: ${existing.status} → ${updated.status}`;
  }

  await AuditService.log({
    user: req.user,
    entityType: 'ORDER',
    entityId: updated.id,
    action: status && status !== existing.status ? 'STATUS_CHANGE' : 'UPDATE',
    summary,
    details: {
      oldAmount: existing.amount,
      newAmount: updated.amount,
      oldStatus: existing.status,
      newStatus: updated.status,
      newVersion: updated.version,
    },
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    order: updated,
  });
};
