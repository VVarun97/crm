import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuditService } from '../services/auditService';
import { AuthenticatedRequest } from '../types';
import { getRecordAccessScope } from '../middleware/rbac';

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'LEAD', 'ARCHIVED']).default('ACTIVE'),
  branch: z.string().default('Mumbai'),
  assignedToId: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'LEAD', 'ARCHIVED']).optional(),
  branch: z.string().optional(),
  assignedToId: z.string().optional().nullable(),
});

export const getCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    search,
    status,
    branch,
    assignedToId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = '1',
    limit = '15',
    cursor, // Keyset/cursor-based pagination for high-volume scale (5M+ rows)
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const accessScope = getRecordAccessScope(req);

  const where: any = {
    ...accessScope,
  };

  if (status) {
    where.status = status;
  }

  if (branch) {
    where.branch = branch;
  }

  if (assignedToId && req.user?.role !== 'EXECUTIVE') {
    where.assignedToId = assignedToId;
  }

  if (search) {
    const s = search.trim();
    where.OR = [
      { name: { contains: s } },
      { email: { contains: s } },
      { code: { contains: s } },
      { company: { contains: s } },
      { phone: { contains: s } },
    ];
  }

  // Cursor-based pagination for ultra-fast index seek at scale
  if (cursor) {
    where.id = { lt: cursor };
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
      take,
      skip: cursor ? 0 : (pageNum - 1) * take,
      include: {
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
        _count: {
          select: { orders: true, leads: true },
        },
      },
    }),
  ]);

  const nextCursor = customers.length === take ? customers[customers.length - 1].id : null;

  res.json({
    success: true,
    data: customers,
    meta: {
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take),
      nextCursor,
    },
  });
};

export const getCustomerById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const accessScope = getRecordAccessScope(req);

  const customer = await prisma.customer.findFirst({
    where: {
      id,
      ...accessScope,
    },
    include: {
      assignedTo: {
        select: { id: true, fullName: true, email: true },
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          employee: { select: { id: true, fullName: true } },
        },
      },
      leads: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!customer) {
    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Customer not found or you lack permission to view this customer.',
    });
    return;
  }

  // Fetch recent activity history for this customer
  const activityLogs = await prisma.auditLog.findMany({
    where: {
      entityType: 'CUSTOMER',
      entityId: id,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  res.json({
    success: true,
    customer,
    activityLogs,
  });
};

export const createCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const data = req.body;

  // Auto-generate customer code e.g. CUST-1023
  const count = await prisma.customer.count();
  const code = `CUST-${1000 + count + 1}`;

  const customer = await prisma.customer.create({
    data: {
      ...data,
      code,
      assignedToId: data.assignedToId || req.user?.id,
      branch: data.branch || req.user?.branch || 'Mumbai',
    },
    include: {
      assignedTo: { select: { id: true, fullName: true } },
    },
  });

  // Audit log: "Rahul created customer CUST-1023"
  await AuditService.log({
    user: req.user,
    entityType: 'CUSTOMER',
    entityId: customer.id,
    action: 'CREATE',
    summary: `${req.user?.fullName} created customer ${customer.code} (${customer.name})`,
    details: { code: customer.code, name: customer.name, status: customer.status },
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    customer,
  });
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const accessScope = getRecordAccessScope(req);

  const existing = await prisma.customer.findFirst({
    where: { id, ...accessScope },
  });

  if (!existing) {
    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Customer not found or unauthorized to update.',
    });
    return;
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: req.body,
    include: {
      assignedTo: { select: { id: true, fullName: true } },
    },
  });

  // Track diff for audit
  const diff: Record<string, { old: any; new: any }> = {};
  for (const key of Object.keys(req.body)) {
    if ((existing as any)[key] !== (updated as any)[key]) {
      diff[key] = { old: (existing as any)[key], new: (updated as any)[key] };
    }
  }

  const summary = diff.status
    ? `${req.user?.fullName} changed customer status: ${diff.status.old} → ${diff.status.new}`
    : `${req.user?.fullName} updated customer ${updated.code} (${updated.name})`;

  await AuditService.log({
    user: req.user,
    entityType: 'CUSTOMER',
    entityId: updated.id,
    action: diff.status ? 'STATUS_CHANGE' : 'UPDATE',
    summary,
    details: diff,
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    customer: updated,
  });
};

export const deleteCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const existing = await prisma.customer.findUnique({
    where: { id },
    include: { orders: { select: { id: true }, take: 1 } },
  });

  if (!existing) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' });
    return;
  }

  if (existing.orders && existing.orders.length > 0) {
    res.status(400).json({
      success: false,
      error: 'HAS_RELATIONS',
      message: 'Cannot delete customer with existing orders. Archive customer instead.',
    });
    return;
  }

  await prisma.customer.delete({ where: { id } });

  await AuditService.log({
    user: req.user,
    entityType: 'CUSTOMER',
    entityId: id,
    action: 'DELETE',
    summary: `${req.user?.fullName} deleted customer ${existing.code} (${existing.name})`,
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    message: 'Customer deleted successfully',
  });
};
