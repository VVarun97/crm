import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';

/**
 * Restricts endpoint to specific roles.
 * Example: requireRoles('ADMIN', 'MANAGER')
 */
export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
};

/**
 * Helper to build IDOR-safe filters for Prisma queries.
 * If user is EXECUTIVE, limits results to records where assignedToId == user.id.
 * If MANAGER or ADMIN, allows broader visibility (or scoped to branch).
 */
export const getRecordAccessScope = (req: AuthenticatedRequest) => {
  const user = req.user;
  if (!user) return { assignedToId: '__NONE__' };

  if (user.role === 'ADMIN') {
    return {}; // Full access
  }

  if (user.role === 'MANAGER') {
    // Branch-level access
    return {
      OR: [
        { branch: user.branch },
        { assignedToId: user.id },
      ],
    };
  }

  // EXECUTIVE: strictly own records or assigned
  return {
    assignedToId: user.id,
  };
};
