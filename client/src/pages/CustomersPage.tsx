import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  Building,
  Mail,
  Phone,
  Clock,
  History,
  ChevronLeft,
  ChevronRight,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import api from '../services/api';
import { Customer, AuditLog } from '../types';
import { useAuth } from '../context/AuthContext';

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerAudits, setCustomerAudits] = useState<AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'ACTIVE',
    branch: user?.branch || 'Mumbai',
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 10,
        sortBy,
        sortOrder,
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/customers', { params });
      setCustomers(res.data.data);
      setTotal(res.data.meta.total);
      setTotalPages(res.data.meta.totalPages);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, statusFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handleViewDetails = async (c: Customer) => {
    try {
      setDetailLoading(true);
      setSelectedCustomer(c);
      const res = await api.get(`/customers/${c.id}`);
      setSelectedCustomer(res.data.customer);
      setCustomerAudits(res.data.activityLogs || []);
    } catch (err) {
      console.error('Failed to fetch customer details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/customers', formData);
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        status: 'ACTIVE',
        branch: user?.branch || 'Mumbai',
      });
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create customer');
    }
  };

  const statusBadges: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    INACTIVE: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    LEAD: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    ARCHIVED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Customer Directory</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Managing {total} enterprise customer accounts with high-scale indexing
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, code (e.g. CUST-1001), email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </form>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="LEAD">LEAD</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="createdAt">Date Created</option>
            <option value="name">Customer Name</option>
            <option value="code">Customer Code</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 transition-colors"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-850/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Customer & Company</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading customer records...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No customers found matching the search criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => handleViewDetails(c)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">
                      {c.code}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-100">{c.name}</p>
                      <p className="text-[11px] text-slate-400">{c.company || '—'}</p>
                    </td>
                    <td className="py-3 px-4 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{c.email}</span>
                      </div>
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          statusBadges[c.status] || ''
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{c.branch}</td>
                    <td className="py-3 px-4">
                      <span className="text-slate-300 font-medium">
                        {c.assignedTo?.fullName || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(c);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                      >
                        View & History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {customers.length} of {total} records (Page {page} of {totalPages || 1})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-750 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-200">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-750 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Customer Detail Drawer with Activity History */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-750 h-full flex flex-col shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-sky-400">
                  {selectedCustomer.code}
                </span>
                <h3 className="text-lg font-bold text-slate-100">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-400">{selectedCustomer.company || 'Individual Client'}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Details */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-750 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-medium text-slate-200">{selectedCustomer.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="font-medium text-slate-200">{selectedCustomer.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-semibold text-emerald-400">{selectedCustomer.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Branch:</span>
                <span className="text-slate-200">{selectedCustomer.branch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Executive:</span>
                <span className="text-sky-300">{selectedCustomer.assignedTo?.fullName || 'None'}</span>
              </div>
            </div>

            {/* Customer Activity History (Requirement 2 & Audit Requirement) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <History className="w-4 h-4 text-sky-400" />
                <span>Customer Activity History</span>
              </div>

              {customerAudits.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No activity logs recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {customerAudits.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg bg-slate-850 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex justify-between text-[11px]">
                        <span className="font-semibold text-sky-400">{log.userName}</span>
                        <span className="text-slate-400">
                          {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-200">{log.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Add New Customer</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Customer / Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Company Name</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="LEAD">LEAD</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300">Branch</label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-750 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-md shadow-sky-500/20"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
