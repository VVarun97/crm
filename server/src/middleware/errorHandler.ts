import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Unhandled Server Error:', err);

  // Prisma Unique Constraint Violation (P2002)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      res.status(409).json({
        success: false,
        error: 'DUPLICATE_RECORD',
        message: `A record with this ${target} already exists.`,
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'The requested record was not found or has been removed.',
      });
      return;
    }
  }

  // SyntaxError in JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: 'MALFORMED_JSON',
      message: 'The request body contains invalid JSON syntax.',
    });
    return;
  }

  // Fallback 500
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.name || 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected internal server error occurred.' 
      : err.message,
  });
};
