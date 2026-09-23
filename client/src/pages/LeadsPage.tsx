import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Target,
  Mail,
  Phone,
  Calendar,
  IndianRupee,
  UserCheck,
  CheckCircle2,
  X,
  Filter,
} from 'lucide-react';
import api from '../services/api';
import { Lead, User } from '../types';

export const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    contactName: '',
    email: '',
    phone: '',
    value: 0,
    status: 'NEW',
    followUpDate: '',
    assignedToId: '',
  });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const [leadsRes, usersRes] = await Promise.all([
        api.get('/leads', { params }),
        api.get('/users'),
      ]);
      setLeads(leadsRes.data.data);
      setUsers(usersRes.data.users);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await api.put(`/leads/${leadId}`, { status: newStatus });
      fetchLeads();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleConvertLead = async (leadId: string) => {
    if (!window.confirm('Convert this lead into an active Customer account?')) return;
    try {
      const res = await api.post(`/leads/${leadId}/convert`);
      alert(`Success! Lead converted to Customer ${res.data.customer.code}`);
      fetchLeads();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to convert lead');
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/leads', {
        ...formData,
        value: Number(formData.value),
        followUpDate: formData.followUpDate || null,
        assignedToId: formData.assignedToId || null,
      });
      setIsAddModalOpen(false);
      setFormData({
        title: '',
        contactName: '',
        email: '',
        phone: '',
        value: 0,
        status: 'NEW',
        followUpDate: '',
        assignedToId: '',
      });
      fetchLeads();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create lead');
    }
  };

  const statusColors: Record<string, string> = {
    NEW: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    CONTACTED: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    QUALIFIED: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    PROPOSAL: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    WON: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    LOST: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Leads Pipeline</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track business opportunities, follow-up timelines, and lead conversions
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Lead</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads by title, contact, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLeads()}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="">All Pipeline Stages</option>
            <option value="NEW">NEW</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="QUALIFIED">QUALIFIED</option>
            <option value="PROPOSAL">PROPOSAL</option>
            <option value="WON">WON</option>
            <option value="LOST">LOST</option>
          </select>
        </div>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Loading sales leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            No leads found matching criteria.
          </div>
        ) : (
          leads.map((l) => (
            <div
              key={l.id}
              className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-100 line-clamp-1">{l.title}</h3>
                  <select
                    value={l.status}
                    onChange={(e) => handleStatusChange(l.id, e.target.value)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border focus:outline-none cursor-pointer ${
                      statusColors[l.status] || ''
                    }`}
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="PROPOSAL">PROPOSAL</option>
                    <option value="WON">WON</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>

                <div className="mt-2 text-lg font-bold text-emerald-400">
                  ₹{l.value.toLocaleString('en-IN')}
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <p className="font-medium text-slate-200">{l.contactName}</p>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{l.email}</span>
                  </div>
                  {l.phone && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{l.phone}</span>
                    </div>
                  )}
                  {l.followUpDate && (
                    <div className="flex items-center gap-1.5 text-amber-300/90 text-[11px] pt-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Follow-up: {new Date(l.followUpDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  Rep: {l.assignedTo?.fullName || 'Unassigned'}
                </span>

                {l.customerId ? (
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Converted
                  </span>
                ) : (
                  <button
                    onClick={() => handleConvertLead(l.id)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-[11px] font-medium transition-colors border border-slate-700"
                  >
                    Convert to Customer
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Create Sales Lead</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Lead / Deal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Cloud Package"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Contact Person *</label>
                <input
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="font-semibold text-slate-300">Estimated Value (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="PROPOSAL">PROPOSAL</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300">Follow-up Date</label>
                  <input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Assign To Executive</label>
                <select
                  value={formData.assignedToId}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="">Auto-assign to myself</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role} - {u.branch})
                    </option>
                  ))}
                </select>
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
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
