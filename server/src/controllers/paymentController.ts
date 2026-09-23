import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuditService } from '../services/auditService';
import { AuthenticatedRequest } from '../types';

export const recordPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentMethod: z.enum(['CARD', 'BANK_TRANSFER', 'UPI', 'CASH']).default('BANK_TRANSFER'),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
});

export const getPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    orderId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = '1',
    limit = '15',
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const where: any = {};
  if (orderId) where.orderId = orderId;

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
      take,
      skip: (pageNum - 1) * take,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            amount: true,
            paymentStatus: true,
            customer: { select: { code: true, name: true } },
          },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    }),
  ]);

  res.json({
    success: true,
    data: payments,
    meta: {
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  });
};

export const recordPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { orderId, amount, paymentMethod, transactionRef, notes } = req.body;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: true,
      customer: true,
    },
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Order not found' });
    return;
  }

  // Calculate existing payments
  const currentPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = order.amount - currentPaid;

  if (remaining <= 0) {
    res.status(400).json({
      success: false,
      error: 'ORDER_ALREADY_PAID',
      message: 'This order is already fully paid.',
    });
    return;
  }

  const count = await prisma.payment.count();
  const paymentNumber = `PAY-${1000 + count + 1}`;

  // Execute payment creation and order status update atomically in transaction
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        paymentNumber,
        orderId,
        amount,
        paymentMethod,
        transactionRef,
        notes,
        createdById: req.user?.id || order.employeeId,
      },
      include: {
        createdBy: { select: { fullName: true } },
      },
    });

    const newTotalPaid = currentPaid + amount;
    let newPaymentStatus = 'PARTIAL';
    if (newTotalPaid >= order.amount) {
      newPaymentStatus = 'PAID';
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: newPaymentStatus,
      },
    });

    return { payment, updatedOrder, totalPaid: newTotalPaid };
  });

  await AuditService.log({
    user: req.user,
    entityType: 'PAYMENT',
    entityId: result.payment.id,
    action: 'CREATE',
    summary: `${req.user?.fullName} recorded payment ${result.payment.paymentNumber} of ₹${amount.toLocaleString('en-IN')} for Order ${order.orderNumber} (Status: ${result.updatedOrder.paymentStatus})`,
    details: {
      orderNumber: order.orderNumber,
      amount,
      paymentStatus: result.updatedOrder.paymentStatus,
      totalPaid: result.totalPaid,
    },
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    payment: result.payment,
    order: result.updatedOrder,
  });
};
