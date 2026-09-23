import prisma from '../prisma';
import { EntityType, AuditAction, AuthUser } from '../types';

interface AuditLogParams {
  user?: AuthUser;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  summary: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

export class AuditService {
  /**
   * Append an immutable record to the audit log.
   * Modifying or deleting audit records is strictly prevented.
   */
  static async log(params: AuditLogParams) {
    try {
      const detailsStr = params.details ? JSON.stringify(params.details) : null;
      return await prisma.auditLog.create({
        data: {
          userId: params.user?.id || null,
          userName: params.user?.fullName || 'System',
          userRole: params.user?.role || 'SYSTEM',
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          summary: params.summary,
          details: detailsStr,
          ipAddress: params.ipAddress || null,
        },
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // In production, send to fallback append-only logging sink / DLQ
    }
  }

  /**
   * Retrieve audit logs with filtering and pagination.
   */
  static async getLogs(query: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    const where: any = {};
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.userId) where.userId = query.userId;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return { total, limit, offset, logs };
  }
}
