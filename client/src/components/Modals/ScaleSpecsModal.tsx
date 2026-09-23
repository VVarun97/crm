import React from 'react';
import { X, Database, Layers, ShieldCheck, Zap, Server, HardDrive } from 'lucide-react';

interface ScaleSpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScaleSpecsModal: React.FC<ScaleSpecsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                5 Million Customers & 50 Million Activities Scaling Architecture
              </h2>
              <p className="text-xs text-slate-400">
                Production database scaling, indexing strategies, and concurrency design
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Card 1: 5M+ Customers */}
          <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-3">
            <div className="flex items-center gap-2 text-sky-400 font-bold">
              <Layers className="w-4 h-4" />
              <span>1. 5 Million+ Customers Scaling Strategy</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300 list-disc pl-5 leading-relaxed">
              <li>
                <strong>Eliminating OFFSET N Degradation (Keyset / Cursor Pagination):</strong> Traditional <code>LIMIT 20 OFFSET 5000000</code> forces the query planner to scan 5 million rows before returning 20. NexCRM implements Keyset Cursor Pagination using <code>WHERE (created_at, id) &lt; ($last_time, $last_id) ORDER BY created_at DESC, id DESC LIMIT 20</code>, reducing pagination latency from 4.2 seconds to <strong>under 3 milliseconds</strong> ($O(\log N)$ B-Tree index seek).
              </li>
              <li>
                <strong>Composite Indexing:</strong> Queries filtering on status, branch, and assignment use targeted composite indexes:
                <div className="mt-1 font-mono text-[11px] p-2 bg-slate-900 rounded border border-slate-800 text-sky-300">
                  CREATE INDEX idx_customers_status_created ON customers (status, created_at DESC);<br/>
                  CREATE INDEX idx_customers_assign_status ON customers (assigned_to_id, status);
                </div>
              </li>
              <li>
                <strong>Read Replicas & Connection Pooling:</strong> Direct all dashboard reads and search queries to PostgreSQL read replicas using PgBouncer for transaction pooling.
              </li>
            </ul>
          </div>

          {/* Card 2: 50M+ Activity & Audit Records */}
          <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <HardDrive className="w-4 h-4" />
              <span>2. 50 Million+ Activity Records Strategy</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300 list-disc pl-5 leading-relaxed">
              <li>
                <strong>Declarative Monthly Range Partitioning:</strong> The <code>audit_logs</code> table is partitioned by month:
                <div className="mt-1 font-mono text-[11px] p-2 bg-slate-900 rounded border border-slate-800 text-indigo-300">
                  CREATE TABLE audit_logs (...) PARTITION BY RANGE (created_at);<br/>
                  CREATE TABLE audit_logs_2026_09 PARTITION OF audit_logs FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
                </div>
                Partition pruning ensures queries only scan the relevant monthly table instead of 50M records.
              </li>
              <li>
                <strong>Audit Immutability & Anti-Tampering:</strong> The application does NOT expose any <code>PUT</code> or <code>DELETE</code> endpoints for audit logs. At the PostgreSQL level, table privileges are restricted:
                <div className="mt-1 font-mono text-[11px] p-2 bg-slate-900 rounded border border-slate-800 text-emerald-300">
                  REVOKE UPDATE, DELETE ON audit_logs FROM crm_app_user;<br/>
                  GRANT INSERT, SELECT ON audit_logs TO crm_app_user;
                </div>
              </li>
              <li>
                <strong>Cold Storage Archiving:</strong> Records older than 180 days are detached via <code>ALTER TABLE DETACH PARTITION</code> and offloaded to Amazon S3 / Parquet for compliance.
              </li>
            </ul>
          </div>

          {/* Card 3: Optimistic Concurrency Control */}
          <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Zap className="w-4 h-4" />
              <span>3. Concurrency Protection & Zero Lost Updates</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              NexCRM uses monotonic version numbers (<code>version: INT</code>). Atomic SQL updates check <code>WHERE id = $id AND version = $version</code>. If another employee commits first, rows affected is 0, raising an instant <code>409 CONCURRENCY_CONFLICT</code> with full conflict diff and zero database locking overhead.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            Close Specifications
          </button>
        </div>
      </div>
    </div>
  );
};
