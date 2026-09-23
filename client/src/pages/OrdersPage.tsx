import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  ShoppingCart,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X,
  CreditCard,
  Building,
  User,
} from 'lucide-react';
import api from '../services/api';
import { Order, Customer, User as UserType } from '../types';

interface OrdersPageProps {
  onOpenSimulator: () => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ onOpenSimulator }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [conflictData, setConflictData] = useState<any>(null);

  // Edit Form State
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('PENDING');

  // Create Form State
  const [createForm, setCreateForm] = useState({
    customerId: '',
    employeeId: '',
    amount: 50000,
    status: 'PROCESSING',
    notes: '',
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (paymentFilter) params.paymentStatus = paymentFilter;

      const [ordersRes, custRes, usersRes] = await Promise.all([
        api.get('/orders', { params }),
        api.get('/customers?limit=100'),
        api.get('/users'),
      ]);

      setOrders(ordersRes.data.data);
      setCustomers(custRes.data.data);
      setUsers(usersRes.data.users);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, paymentFilter]);

  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setEditAmount(order.amount);
    setEditStatus(order.status);
    setConflictData(null);
  };

  const handleSaveEdit = async (forceOverwrite = false) => {
    if (!editingOrder) return;
    try {
      await api.put(`/orders/${editingOrder.id}`, {
        amount: Number(editAmount),
        status: editStatus,
        version: editingOrder.version,
        forceOverwrite,
      });
      setEditingOrder(null);
      setConflictData(null);
      fetchOrders();
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Concurrency conflict detected!
        setConflictData(err.response.data.conflict);
      } else {
        alert(err.response?.data?.message || 'Failed to update order');
      }
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/orders', {
        ...createForm,
        amount: Number(createForm.amount),
      });
      setIsCreateModalOpen(false);
      setCreateForm({
        customerId: '',
        employeeId: '',
        amount: 50000,
        status: 'PROCESSING',
        notes: '',
      });
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create order');
    }
  };

  const statusBadges: Record<string, string> = {
    PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    PROCESSING: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    CANCELLED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  const paymentBadges: Record<string, string> = {
    UNPAID: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    PARTIAL: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    PAID: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Concurrency Race Condition Highlight */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/40 via-indigo-950/40 to-slate-900 border border-sky-500/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Zap className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider">
              Concurrency Scenario Engine Active
            </h3>
            <p className="text-xs text-slate-300">
              Orders utilize version-based Optimistic Concurrency Control (OCC) to prevent lost updates.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/25 transition-all"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Launch ₹50k → ₹55k/₹60k Race Simulator</span>
        </button>
      </div>

      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Orders & Operations</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage customer sales orders, fulfillment states, and payment statuses
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Order</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order number (e.g. ORD-1001) or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="">All Fulfillment Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="">All Payment Statuses</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="PAID">PAID</option>
          </select>

          <button
            onClick={fetchOrders}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 transition-colors"
            title="Refresh orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-850/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Fulfillment Status</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">OCC Version</th>
                <th className="py-3 px-4">Assigned Rep</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">
                      {o.orderNumber}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-100">{o.customer?.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{o.customer?.code}</p>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-100 text-sm">
                      ₹{o.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          statusBadges[o.status] || ''
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          paymentBadges[o.paymentStatus] || ''
                        }`}
                      >
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                        v{o.version}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {o.employee?.fullName || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(o)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                      >
                        Edit Order
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Order Modal with OCC Conflict Handler */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-sky-400">
                  {editingOrder.orderNumber}
                </span>
                <h3 className="text-base font-bold text-slate-100">Edit Order Details</h3>
              </div>
              <button onClick={() => setEditingOrder(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* OCC Conflict Alert Banner if 409 Conflict occurred */}
            {conflictData && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-600/50 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>CONCURRENCY CONFLICT DETECTED! (HTTP 409)</span>
                </div>
                <p className="text-xs text-rose-200/90 leading-relaxed">
                  Another employee committed changes to this order while you were editing!
                </p>
                <div className="text-[11px] p-2 bg-slate-950 rounded border border-rose-800/40 space-y-1 font-mono text-slate-300">
                  <p>Database Current Amount: ₹{conflictData.currentAmount?.toLocaleString('en-IN')}</p>
                  <p>Database Current Version: {conflictData.currentVersion}</p>
                  <p className="text-amber-400">Your Submitted Amount: ₹{conflictData.submittedAmount?.toLocaleString('en-IN')}</p>
                  <p className="text-amber-400">Your Stale Version: {conflictData.submittedVersion}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setEditAmount(conflictData.currentAmount);
                      editingOrder.version = conflictData.currentVersion;
                      setConflictData(null);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold"
                  >
                    Reload Latest (₹{conflictData.currentAmount?.toLocaleString('en-IN')})
                  </button>
                  <button
                    onClick={() => handleSaveEdit(true)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                  >
                    Force Overwrite
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Order Amount (₹)</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-sky-500 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Fulfillment Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>Client: {editingOrder.customer?.name}</p>
                <p>Current Read Version: {editingOrder.version}</p>
                <p>Payment State: {editingOrder.paymentStatus}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-750 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(false)}
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-md shadow-sky-500/20"
                >
                  Commit Changes (OCC Check)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Create New Order</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Customer Account *</label>
                <select
                  required
                  value={createForm.customerId}
                  onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="">Select a Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Order Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={createForm.amount}
                  onChange={(e) => setCreateForm({ ...createForm, amount: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Fulfillment Status</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Assigned Employee</label>
                <select
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="">Auto-assign to myself</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-750 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-md shadow-sky-500/20"
                >
                  Place Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
