export type UserRole = 'ADMIN' | 'MANAGER' | 'EXECUTIVE';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  branch: string;
  department: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LEAD' | 'ARCHIVED';
  branch: string;
  assignedToId?: string;
  assignedTo?: { id: string; fullName: string; email: string };
  createdAt: string;
  updatedAt: string;
  _count?: { orders: number; leads: number };
}

export interface Lead {
  id: string;
  title: string;
  contactName: string;
  email: string;
  phone?: string;
  value: number;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
  followUpDate?: string;
  assignedToId?: string;
  assignedTo?: { id: string; fullName: string; email: string };
  customerId?: string;
  customer?: { id: string; code: string; name: string };
  branch: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  employeeId: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  version: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; code: string; name: string; email: string; phone?: string };
  employee?: { id: string; fullName: string; email: string };
  payments?: { id: string; paymentNumber: string; amount: number; createdAt: string }[];
}

export interface Payment {
  id: string;
  paymentNumber: string;
  orderId: string;
  amount: number;
  paymentMethod: 'CARD' | 'BANK_TRANSFER' | 'UPI' | 'CASH';
  transactionRef?: string;
  notes?: string;
  createdById: string;
  createdAt: string;
  order?: {
    id: string;
    orderNumber: string;
    amount: number;
    paymentStatus: string;
    customer?: { code: string; name: string };
  };
  createdBy?: { id: string; fullName: string; email: string };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate?: string;
  assignedToId?: string;
  createdById: string;
  assignedTo?: { id: string; fullName: string; email: string };
  createdBy?: { id: string; fullName: string };
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName: string;
  userRole?: string;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
  user?: { id: string; fullName: string; email: string; role: string };
}

export interface DashboardMetrics {
  totalCustomers: number;
  newLeads: number;
  conversionRate: number;
  totalOrders: number;
  revenue: number;
  pendingPayments: number;
  outstandingAmount: number;
  openTasks: number;
}
