import { Response } from 'express';
import { AuditService } from '../services/auditService';
import { AuthenticatedRequest } from '../types';

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { entityType, entityId, userId, page = '1', limit = '20' } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * take;

  const result = await AuditService.getLogs({
    entityType,
    entityId,
    userId,
    limit: take,
    offset,
  });

  res.json({
    success: true,
    data: result.logs,
    meta: {
      total: result.total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(result.total / take),
    },
  });
};
