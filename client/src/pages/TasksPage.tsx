import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  User,
  Filter,
} from 'lucide-react';
import api from '../services/api';
import { Task, User as UserType } from '../types';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'PENDING',
    dueDate: '',
    assignedToId: '',
  });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const [tasksRes, usersRes] = await Promise.all([
        api.get('/tasks', { params }),
        api.get('/users'),
      ]);

      setTasks(tasksRes.data.data);
      setUsers(usersRes.data.users);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter]);

  const handleStatusToggle = async (taskId: string, currentStatus: string) => {
    const nextStatus =
      currentStatus === 'PENDING'
        ? 'IN_PROGRESS'
        : currentStatus === 'IN_PROGRESS'
        ? 'COMPLETED'
        : 'PENDING';

    try {
      await api.put(`/tasks/${taskId}`, { status: nextStatus });
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update task');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/tasks', {
        ...formData,
        dueDate: formData.dueDate || null,
        assignedToId: formData.assignedToId || null,
      });
      setIsAddModalOpen(false);
      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        status: 'PENDING',
        dueDate: '',
        assignedToId: '',
      });
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create task');
    }
  };

  const priorityColors: Record<string, string> = {
    LOW: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    MEDIUM: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    HIGH: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    URGENT: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Tasks & Operations</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational action items, priority tracking, and due date management
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
        >
          <option value="">All Priorities</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="URGENT">URGENT</option>
        </select>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">No tasks found.</div>
        ) : (
          tasks.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-750 transition-all flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3 flex-1 min-w-[280px]">
                <button
                  onClick={() => handleStatusToggle(t.id, t.status)}
                  className={`mt-0.5 p-1 rounded-lg border transition-colors ${
                    t.status === 'COMPLETED'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'border-slate-600 hover:border-sky-400 text-transparent'
                  }`}
                  title="Toggle status"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <div className="space-y-1">
                  <h4
                    className={`font-semibold text-sm ${
                      t.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-100'
                    }`}
                  >
                    {t.title}
                  </h4>
                  {t.description && (
                    <p className="text-xs text-slate-400">{t.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      Assigned: {t.assignedTo?.fullName || 'Unassigned'}
                    </span>
                    {t.dueDate && (
                      <span className="flex items-center gap-1 text-amber-300/90 font-medium">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        Due: {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    priorityColors[t.priority] || ''
                  }`}
                >
                  {t.priority}
                </span>

                <span
                  onClick={() => handleStatusToggle(t.id, t.status)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer select-none transition-colors ${
                    t.status === 'COMPLETED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : t.status === 'IN_PROGRESS'
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {t.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Create Operational Task</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct SLA review with client"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Description</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Assign To Employee</label>
                <select
                  value={formData.assignedToId}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
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
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-750 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-md shadow-sky-500/20"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
