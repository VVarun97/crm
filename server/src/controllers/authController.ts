import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../prisma';
import { config } from '../config';
import { AuditService } from '../services/auditService';
import { AuthenticatedRequest, UserRole } from '../types';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || !user.isActive) {
    res.status(401).json({
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    res.status(401).json({
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
    return;
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as UserRole,
    branch: user.branch,
    department: user.department,
  };

  const token = jwt.sign(tokenPayload, config.jwtSecret, {
    expiresIn: '7d',
  });

  await AuditService.log({
    user: tokenPayload,
    entityType: 'AUTH',
    entityId: user.id,
    action: 'LOGIN',
    summary: `${user.fullName} (${user.role}) logged in successfully`,
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    token,
    user: tokenPayload,
  });
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      branch: true,
      department: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
    return;
  }

  res.json({
    success: true,
    user,
  });
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
};
