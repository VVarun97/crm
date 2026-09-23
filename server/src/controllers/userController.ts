import { Response } from 'express';
import prisma from '../prisma';
import { AuthenticatedRequest } from '../types';

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      branch: true,
      department: true,
    },
    orderBy: { fullName: 'asc' },
  });

  res.json({
    success: true,
    users,
  });
};
