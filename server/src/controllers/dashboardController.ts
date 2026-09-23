import { Response } from 'express';
import prisma from '../prisma';
import { AuthenticatedRequest } from '../types';

export const getDashboardMetrics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { branch, employeeId, startDate, endDate } = req.query as Record<string, string>;

  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const hasDateFilter = Object.keys(dateFilter).length > 0;

  // Filter scopes
  const customerWhere: any = {};
  const leadWhere: any = {};
  const orderWhere: any = {};
  const taskWhere: any = {};
  const paymentWhere: any = {};

  if (branch) {
    customerWhere.branch = branch;
    leadWhere.branch = branch;
  }

  if (employeeId) {
    customerWhere.assignedToId = employeeId;
    leadWhere.assignedToId = employeeId;
    orderWhere.employeeId = employeeId;
    taskWhere.assignedToId = employeeId;
    paymentWhere.createdById = employeeId;
  }

  // If Executive, force employee scope
  if (req.user?.role === 'EXECUTIVE') {
    customerWhere.assignedToId = req.user.id;
    leadWhere.assignedToId = req.user.id;
    orderWhere.employeeId = req.user.id;
    taskWhere.assignedToId = req.user.id;
  }

  if (hasDateFilter) {
    customerWhere.createdAt = dateFilter;
    leadWhere.createdAt = dateFilter;
    orderWhere.createdAt = dateFilter;
    paymentWhere.createdAt = dateFilter;
  }

  // Parallel database queries
  const [
    totalCustomers,
    allLeads,
    allOrders,
    allPayments,
    openTasks,
    recentAudits,
  ] = await Promise.all([
    prisma.customer.count({ where: customerWhere }),
    prisma.lead.findMany({
      where: leadWhere,
      select: { status: true, value: true },
    }),
    prisma.order.findMany({
      where: orderWhere,
      select: { id: true, amount: true, status: true, paymentStatus: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: paymentWhere,
      select: { amount: true, createdAt: true },
    }),
    prisma.task.count({
      where: {
        ...taskWhere,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  // Lead metrics
  const totalLeads = allLeads.length;
  const wonLeads = allLeads.filter((l) => l.status === 'WON').length;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // Order & Financial metrics
  const totalOrders = allOrders.length;
  const totalOrderAmount = allOrders.reduce((sum, o) => sum + o.amount, 0);
  const revenue = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingAmount = Math.max(0, totalOrderAmount - revenue);
  const pendingPayments = allOrders.filter((o) => o.paymentStatus !== 'PAID').length;

  // Lead pipeline status breakdown
  const leadPipeline = {
    NEW: allLeads.filter((l) => l.status === 'NEW').length,
    CONTACTED: allLeads.filter((l) => l.status === 'CONTACTED').length,
    QUALIFIED: allLeads.filter((l) => l.status === 'QUALIFIED').length,
    PROPOSAL: allLeads.filter((l) => l.status === 'PROPOSAL').length,
    WON: wonLeads,
    LOST: allLeads.filter((l) => l.status === 'LOST').length,
  };

  // Order status breakdown
  const orderStatusBreakdown = {
    PENDING: allOrders.filter((o) => o.status === 'PENDING').length,
    PROCESSING: allOrders.filter((o) => o.status === 'PROCESSING').length,
    COMPLETED: allOrders.filter((o) => o.status === 'COMPLETED').length,
    CANCELLED: allOrders.filter((o) => o.status === 'CANCELLED').length,
  };

  res.json({
    success: true,
    metrics: {
      totalCustomers,
      newLeads: totalLeads,
      conversionRate,
      totalOrders,
      revenue,
      pendingPayments,
      outstandingAmount,
      openTasks,
    },
    leadPipeline,
    orderStatusBreakdown,
    recentAudits,
  });
};
