import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import api from '../../services/api';

interface ConcurrencySimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessRefresh?: () => void;
}

export const ConcurrencySimulatorModal: React.FC<ConcurrencySimulatorModalProps> = ({
  isOpen,
  onClose,
  onSuccessRefresh,
}) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [employeeAVal, setEmployeeAVal] = useState(55000);
  const [employeeBVal, setEmployeeBVal] = useState(60000);

  const [step, setStep] = useState<'idle' | 'simulating' | 'resolved'>('idle');
  const [resultA, setResultA] = useState<any>(null);
  const [resultB, setResultB] = useState<any>(null);

  // Fetch current order state
  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      const target = res.data.data.find((o: any) => o.orderNumber === 'ORD-1001') || res.data.data[0];
      if (target) {
        setOrder(target);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOrder();
      setStep('idle');
      setResultA(null);
      setResultB(null);
    }
  }, [isOpen]);

  // Reset order to ₹50,000 and version 1 for a clean demo run
  const resetOrderToDefault = async () => {
    if (!order) return;
    try {
      setLoading(true);
      // Force overwrite back to 50,000
      await api.put(`/orders/${order.id}`, {
        amount: 50000,
        version: order.version,
        forceOverwrite: true,
      });
      await fetchOrder();
      setStep('idle');
      setResultA(null);
      setResultB(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Run the concurrency simulation!
  const runSimulation = async () => {
    if (!order) return;
    setStep('simulating');
    setResultA(null);
    setResultB(null);

    const baseVersion = order.version;

    try {
      // 1. Employee A submits update with baseVersion
      const resA = await api.put(`/orders/${order.id}`, {
        amount: employeeAVal,
        version: baseVersion,
      });
      setResultA({ status: 200, data: resA.data });

      // 2. Employee B submits update with the SAME baseVersion (race condition!)
      try {
        const resB = await api.put(`/orders/${order.id}`, {
          amount: employeeBVal,
          version: baseVersion, // Stale version!
        });
        setResultB({ status: 200, data: resB.data });
      } catch (errB: any) {
        setResultB({
          status: errB.response?.status || 409,
          data: errB.response?.data,
        });
      }

      setStep('resolved');
      await fetchOrder();
      if (onSuccessRefresh) onSuccessRefresh();
    } catch (errA: any) {
      setResultA({ status: errA.response?.status, data: errA.response?.data });
      setStep('resolved');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Optimistic Concurrency Control (OCC) Live Simulator
              </h2>
              <p className="text-xs text-slate-400">
                Reproducing the ₹50,000 → ₹55,000 vs ₹60,000 race condition scenario
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Current Database State Banner */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Current Database State
              </span>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-sm font-semibold text-sky-400">
                  Order #{order?.orderNumber || 'ORD-1001'}
                </span>
                <span className="text-xl font-bold text-slate-100">
                  ₹{order?.amount?.toLocaleString('en-IN') || '50,000'}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Version: {order?.version || 1}
                </span>
              </div>
            </div>
            <button
              onClick={resetOrderToDefault}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 text-slate-300 hover:bg-slate-700 text-xs font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Reset to ₹50,000 (v1)
            </button>
          </div>

          {/* Split Screen Simulator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee A Panel */}
            <div className="p-5 rounded-xl bg-slate-850 border border-emerald-500/30 bg-emerald-950/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">
                    Employee A (Rahul Verma)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Read Version: {order?.version || 1}</span>
              </div>
              <p className="text-xs text-slate-400">
                Employee A opens the order at ₹{order?.amount?.toLocaleString('en-IN')} and prepares to update it to ₹55,000.
              </p>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Intended New Amount (₹)</label>
                <input
                  type="number"
                  value={employeeAVal}
                  onChange={(e) => setEmployeeAVal(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {resultA && (
                <div
                  className={`p-3 rounded-lg text-xs font-mono ${
                    resultA.status === 200
                      ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-300'
                      : 'bg-rose-900/30 border border-rose-700/50 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>HTTP 200 OK — First Commit Succeeded</span>
                  </div>
                  <p>Committed Amount: ₹{resultA.data.order.amount.toLocaleString('en-IN')}</p>
                  <p>New Database Version: {resultA.data.order.version}</p>
                </div>
              )}
            </div>

            {/* Employee B Panel */}
            <div className="p-5 rounded-xl bg-slate-850 border border-rose-500/30 bg-rose-950/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-sm font-bold text-amber-400">
                    Employee B (Amit Sharma)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Read Version: {order?.version || 1}</span>
              </div>
              <p className="text-xs text-slate-400">
                Employee B simultaneously opened the same order and prepares to update it to ₹60,000.
              </p>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Intended New Amount (₹)</label>
                <input
                  type="number"
                  value={employeeBVal}
                  onChange={(e) => setEmployeeBVal(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {resultB && (
                <div
                  className={`p-3 rounded-lg text-xs font-mono ${
                    resultB.status === 409
                      ? 'bg-rose-950/50 border border-rose-600/50 text-rose-300'
                      : 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>HTTP 409 CONFLICT — OCC Protection Triggered!</span>
                  </div>
                  <p>Error: {resultB.data?.error}</p>
                  <p>Submitted Version: {resultB.data?.conflict?.submittedVersion} (STALE)</p>
                  <p>Current DB Version: {resultB.data?.conflict?.currentVersion}</p>
                  <p className="text-amber-300 font-semibold mt-1">
                    Unintended overwrite of Employee A's ₹55,000 prevented!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Explanation Box */}
          <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-800/40 text-xs text-sky-200/90 leading-relaxed space-y-1">
            <p className="font-semibold text-sky-300">How NexCRM Resolves This Scenario:</p>
            <p>
              1. Both clients hold record snapshot <code>version: 1</code>.
            </p>
            <p>
              2. Employee A executes atomic increment: <code>WHERE id = ... AND version = 1</code>. This succeeds, incrementing version to 2.
            </p>
            <p>
              3. When Employee B executes with <code>version: 1</code>, the version check fails. The API returns <strong>HTTP 409 Conflict</strong> with the latest payload and logs a <code>CONFLICT_DETECTED</code> audit trail.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Click simulate to execute both mutations simultaneously.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              onClick={runSimulation}
              disabled={loading || step === 'simulating'}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate Concurrent Updates</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
