import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AuditService } from '../services/auditService';
import { AuthenticatedRequest } from '../types';

export const createTaskSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PENDING'),
  dueDate: z.string().optional().nullable(),
  assignedToId: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  dueDate: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});

export const getTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    status,
    priority,
    assignedToId,
    sortBy = 'dueDate',
    sortOrder = 'asc',
    page = '1',
    limit = '20',
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;

  if (req.user?.role === 'EXECUTIVE') {
    where.assignedToId = req.user.id;
  } else if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
      take,
      skip: (pageNum - 1) * take,
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  res.json({
    success: true,
    data: tasks,
    meta: {
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  });
};

export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const data = req.body;

  const task = await prisma.task.create({
    data: {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      createdById: req.user!.id,
      assignedToId: data.assignedToId || req.user!.id,
    },
    include: {
      assignedTo: { select: { fullName: true } },
    },
  });

  await AuditService.log({
    user: req.user,
    entityType: 'TASK',
    entityId: task.id,
    action: 'CREATE',
    summary: `${req.user?.fullName} created task "${task.title}" (Priority: ${task.priority})`,
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, task });
};

export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const existing = await prisma.task.findUnique({ where: { id } });

  if (!existing) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' });
    return;
  }

  const updateData: any = { ...req.body };
  if (updateData.dueDate !== undefined) {
    updateData.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
  }

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignedTo: { select: { fullName: true } },
    },
  });

  const isStatusChange = updateData.status && updateData.status !== existing.status;
  const summary = isStatusChange
    ? `${req.user?.fullName} marked task "${updated.title}" as ${updated.status}`
    : `${req.user?.fullName} updated task "${updated.title}"`;

  await AuditService.log({
    user: req.user,
    entityType: 'TASK',
    entityId: id,
    action: isStatusChange ? 'STATUS_CHANGE' : 'UPDATE',
    summary,
    details: { oldStatus: existing.status, newStatus: updated.status },
    ipAddress: req.ip,
  });

  res.json({ success: true, task: updated });
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const existing = await prisma.task.findUnique({ where: { id } });

  if (!existing) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' });
    return;
  }

  await prisma.task.delete({ where: { id } });

  await AuditService.log({
    user: req.user,
    entityType: 'TASK',
    entityId: id,
    action: 'DELETE',
    summary: `${req.user?.fullName} deleted task "${existing.title}"`,
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Task deleted successfully' });
};
