import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  IndianRupee,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
  X,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import { Payment, Order } from '../types';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'UPI' | 'CARD' | 'CASH'>('BANK_TRANSFER');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const [payRes, ordersRes] = await Promise.all([
        api.get('/payments'),
        api.get('/orders?limit=100'),
      ]);
      setPayments(payRes.data.data);
      // Filter orders that still need payment
      const pending = ordersRes.data.data.filter((o: Order) => o.paymentStatus !== 'PAID');
      setUnpaidOrders(pending);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const selectedOrder = unpaidOrders.find((o) => o.id === selectedOrderId);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      alert('Please select an order');
      return;
    }

    try {
      await api.post('/payments', {
        orderId: selectedOrderId,
        amount: Number(amount),
        paymentMethod,
        transactionRef: transactionRef || undefined,
        notes: notes || undefined,
      });

      setIsRecordModalOpen(false);
      setSelectedOrderId('');
      setAmount(0);
      setTransactionRef('');
      setNotes('');
      fetchPayments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const methodBadges: Record<string, string> = {
    UPI: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    BANK_TRANSFER: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    CARD: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    CASH: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Payments & Collections</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit-backed settlement history and transactional order balance reconciliations
          </p>
        </div>

        <button
          onClick={() => {
            if (unpaidOrders.length > 0) {
              setSelectedOrderId(unpaidOrders[0].id);
              setAmount(unpaidOrders[0].amount);
            }
            setIsRecordModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Payments Table */}
      <div className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-850/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Payment #</th>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">
                      {p.paymentNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-200">
                      {p.order?.orderNumber}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-100">{p.order?.customer?.name || '—'}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{p.order?.customer?.code}</p>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400 text-sm">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          methodBadges[p.paymentMethod] || ''
                        }`}
                      >
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {p.transactionRef || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {p.createdBy?.fullName || 'System'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Record Client Payment</h3>
              <button onClick={() => setIsRecordModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Select Order to Settle *</label>
                <select
                  required
                  value={selectedOrderId}
                  onChange={(e) => {
                    setSelectedOrderId(e.target.value);
                    const found = unpaidOrders.find((o) => o.id === e.target.value);
                    if (found) setAmount(found.amount);
                  }}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="">Select Pending Order</option>
                  {unpaidOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} - {o.customer?.name} (Total: ₹{o.amount.toLocaleString('en-IN')} - Status: {o.paymentStatus})
                    </option>
                  ))}
                </select>
              </div>

              {selectedOrder && (
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-750 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Order Amount:</span>
                    <span className="font-semibold text-slate-100">₹{selectedOrder.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Payment Status:</span>
                    <span className="font-semibold text-amber-400">{selectedOrder.paymentStatus}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-300">Payment Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-sky-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="BANK_TRANSFER">BANK TRANSFER (NEFT/RTGS)</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="CARD">CREDIT/DEBIT CARD</option>
                    <option value="CASH">CASH</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300">Transaction Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. NEFT-992381"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Notes / Audit Remarks</label>
                <input
                  type="text"
                  placeholder="Optional settlement notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-750 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/20"
                >
                  Confirm & Update Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
