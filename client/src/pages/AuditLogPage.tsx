import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Lock,
  Calendar,
  User,
  ChevronDown,
  RefreshCw,
  Code2,
} from 'lucide-react';
import api from '../services/api';
import { AuditLog } from '../types';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedDetails, setSelectedDetails] = useState<any>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (entityFilter) params.entityType = entityFilter;

      const res = await api.get('/audit-logs', { params });
      setLogs(res.data.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  const actionBadges: Record<string, string> = {
    CREATE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    UPDATE: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    STATUS_CHANGE: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    DELETE: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    LOGIN: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    CONFLICT_DETECTED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Immutability Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              Append-Only Tamper-Evident Audit Trail
            </h3>
            <p className="text-xs text-slate-300">
              Audit records are cryptographically stored with application and database-level immutability. No updates or deletions are permitted.
            </p>
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Enterprise Audit Log</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full compliance audit stream recording all CRUD operations and state changes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="">All Entities</option>
            <option value="CUSTOMER">CUSTOMERS</option>
            <option value="LEAD">LEADS</option>
            <option value="ORDER">ORDERS</option>
            <option value="PAYMENT">PAYMENTS</option>
            <option value="TASK">TASKS</option>
            <option value="AUTH">AUTHENTICATION</option>
          </select>

          <button
            onClick={fetchLogs}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-850/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Summary Description</th>
                <th className="py-3 px-4">Details Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-200">{log.userName}</span>
                      {log.userRole && (
                        <span className="ml-1.5 text-[10px] text-slate-400">({log.userRole})</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-sky-400 text-[11px]">
                      {log.entityType}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          actionBadges[log.action] || 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-medium">
                      {log.summary}
                    </td>
                    <td className="py-3 px-4">
                      {log.details ? (
                        <button
                          onClick={() => {
                            try {
                              setSelectedDetails(JSON.parse(log.details!));
                            } catch (e) {
                              setSelectedDetails(log.details);
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] border border-slate-700"
                        >
                          <Code2 className="w-3 h-3 text-sky-400" />
                          <span>View Diff</span>
                        </button>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Diff Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                <span>Audit Payload Diff Details</span>
              </h3>
              <button onClick={() => setSelectedDetails(null)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sky-300 font-mono text-xs overflow-x-auto max-h-96">
              {JSON.stringify(selectedDetails, null, 2)}
            </pre>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedDetails(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
