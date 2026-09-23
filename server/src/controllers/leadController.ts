import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuditService } from '../services/auditService';
import { AuthenticatedRequest } from '../types';
import { getRecordAccessScope } from '../middleware/rbac';

export const createLeadSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  contactName: z.string().min(2, 'Contact name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  value: z.number().min(0).default(0),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).default('NEW'),
  followUpDate: z.string().optional().nullable(),
  assignedToId: z.string().optional(),
  customerId: z.string().optional().nullable(),
  branch: z.string().default('Mumbai'),
});

export const updateLeadSchema = z.object({
  title: z.string().min(2).optional(),
  contactName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  value: z.number().min(0).optional(),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
  followUpDate: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  branch: z.string().optional(),
});

export const getLeads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    search,
    status,
    branch,
    assignedToId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = '1',
    limit = '15',
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const accessScope = getRecordAccessScope(req);

  const where: any = {
    ...accessScope,
  };

  if (status) where.status = status;
  if (branch) where.branch = branch;
  if (assignedToId && req.user?.role !== 'EXECUTIVE') where.assignedToId = assignedToId;

  if (search) {
    const s = search.trim();
    where.OR = [
      { title: { contains: s } },
      { contactName: { contains: s } },
      { email: { contains: s } },
      { phone: { contains: s } },
    ];
  }

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
      take,
      skip: (pageNum - 1) * take,
      include: {
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
        customer: {
          select: { id: true, code: true, name: true },
        },
      },
    }),
  ]);

  res.json({
    success: true,
    data: leads,
    meta: {
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  });
};

export const getLeadById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const accessScope = getRecordAccessScope(req);

  const lead = await prisma.lead.findFirst({
    where: { id, ...accessScope },
    include: {
      assignedTo: { select: { id: true, fullName: true, email: true } },
      customer: { select: { id: true, code: true, name: true } },
    },
  });

  if (!lead) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' });
    return;
  }

  const activityLogs = await prisma.auditLog.findMany({
    where: { entityType: 'LEAD', entityId: id },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, lead, activityLogs });
};

export const createLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const data = req.body;

  const lead = await prisma.lead.create({
    data: {
      ...data,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      assignedToId: data.assignedToId || req.user?.id,
      branch: data.branch || req.user?.branch || 'Mumbai',
    },
    include: {
      assignedTo: { select: { id: true, fullName: true } },
    },
  });

  await AuditService.log({
    user: req.user,
    entityType: 'LEAD',
    entityId: lead.id,
    action: 'CREATE',
    summary: `${req.user?.fullName} created lead "${lead.title}" for ${lead.contactName}`,
    details: { value: lead.value, status: lead.status },
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, lead });
};

export const updateLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const accessScope = getRecordAccessScope(req);

  const existing = await prisma.lead.findFirst({
    where: { id, ...accessScope },
  });

  if (!existing) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' });
    return;
  }

  const updateData: any = { ...req.body };
  if (updateData.followUpDate !== undefined) {
    updateData.followUpDate = updateData.followUpDate ? new Date(updateData.followUpDate) : null;
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, fullName: true } },
    },
  });

  // Track diff
  const diff: Record<string, { old: any; new: any }> = {};
  for (const key of Object.keys(updateData)) {
    if (String((existing as any)[key]) !== String((updated as any)[key])) {
      diff[key] = { old: (existing as any)[key], new: (updated as any)[key] };
    }
  }

  // Check for status change: e.g. "Amit changed lead status: NEW → QUALIFIED"
  const isStatusChange = !!diff.status;
  const summary = isStatusChange
    ? `${req.user?.fullName} changed lead status: ${diff.status.old} → ${diff.status.new}`
    : `${req.user?.fullName} updated lead "${updated.title}"`;

  await AuditService.log({
    user: req.user,
    entityType: 'LEAD',
    entityId: updated.id,
    action: isStatusChange ? 'STATUS_CHANGE' : 'UPDATE',
    summary,
    details: diff,
    ipAddress: req.ip,
  });

  res.json({ success: true, lead: updated });
};

export const convertLeadToCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' });
    return;
  }

  if (lead.customerId) {
    res.status(400).json({
      success: false,
      error: 'ALREADY_CONVERTED',
      message: 'This lead has already been converted to a customer.',
    });
    return;
  }

  const customerCount = await prisma.customer.count();
  const code = `CUST-${1000 + customerCount + 1}`;

  // Execute in transaction
  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        code,
        name: lead.contactName,
        email: lead.email,
        phone: lead.phone,
        company: lead.title,
        status: 'ACTIVE',
        assignedToId: lead.assignedToId || req.user?.id,
        branch: lead.branch,
      },
    });

    const updatedLead = await tx.lead.update({
      where: { id },
      data: {
        status: 'WON',
        customerId: customer.id,
      },
    });

    return { customer, lead: updatedLead };
  });

  await AuditService.log({
    user: req.user,
    entityType: 'LEAD',
    entityId: id,
    action: 'STATUS_CHANGE',
    summary: `${req.user?.fullName} converted lead "${lead.title}" to customer ${result.customer.code}`,
    details: { customerId: result.customer.id, customerCode: result.customer.code },
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    message: 'Lead successfully converted to customer',
    customer: result.customer,
    lead: result.lead,
  });
};

export const deleteLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' });
    return;
  }

  await prisma.lead.delete({ where: { id } });

  await AuditService.log({
    user: req.user,
    entityType: 'LEAD',
    entityId: id,
    action: 'DELETE',
    summary: `${req.user?.fullName} deleted lead "${lead.title}"`,
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Lead deleted successfully' });
};
