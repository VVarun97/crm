import { Request } from 'express';

export type UserRole = 'ADMIN' | 'MANAGER' | 'EXECUTIVE';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  branch: string;
  department: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export type EntityType = 'CUSTOMER' | 'LEAD' | 'ORDER' | 'PAYMENT' | 'TASK' | 'AUTH';
export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'STATUS_CHANGE' 
  | 'LOGIN' 
  | 'PAYMENT_RECORDED' 
  | 'CONFLICT_DETECTED';
