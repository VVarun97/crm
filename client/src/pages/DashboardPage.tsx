import React, { useState, useEffect } from 'react';
import {
  Users,
  Target,
  TrendingUp,
  ShoppingCart,
  IndianRupee,
  Clock,
  AlertCircle,
  CheckSquare,
  Filter,
  RefreshCw,
  Activity,
} from 'lucide-react';
import api from '../services/api';
import { DashboardMetrics, AuditLog } from '../types';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [pipeline, setPipeline] = useState<Record<string, number>>({});
  const [orderStatus, setOrderStatus] = useState<Record<string, number>>({});
  const [recentAudits, setRecentAudits] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [branch, setBranch] = useState('');
  const [dateRange, setDateRange] = useState('all');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (branch) params.branch = branch;

      const now = new Date();
      if (dateRange === 'today') {
        const start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        params.startDate = start;
      } else if (dateRange === 'week') {
        const start = new Date(now.setDate(now.getDate() - 7)).toISOString();
        params.startDate = start;
      } else if (dateRange === 'month') {
        const start = new Date(now.setDate(now.getDate() - 30)).toISOString();
        params.startDate = start;
      }

      const res = await api.get('/dashboard/metrics', { params });
      setMetrics(res.data.metrics);
      setPipeline(res.data.leadPipeline);
      setOrderStatus(res.data.orderStatusBreakdown);
      setRecentAudits(res.data.recentAudits);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [branch, dateRange]);

  const cards = [
    {
      title: 'Total Customers',
      value: metrics?.totalCustomers || 0,
      icon: Users,
      color: 'sky',
      subtitle: 'Active across all branches',
    },
    {
      title: 'New Leads',
      value: metrics?.newLeads || 0,
      icon: Target,
      color: 'amber',
      subtitle: 'In active sales pipeline',
    },
    {
      title: 'Conversion Rate',
      value: `${metrics?.conversionRate || 0}%`,
      icon: TrendingUp,
      color: 'emerald',
      subtitle: 'Leads converted to customers',
    },
    {
      title: 'Total Orders',
      value: metrics?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'indigo',
      subtitle: 'Booked across all accounts',
    },
    {
      title: 'Total Revenue',
      value: `₹${(metrics?.revenue || 0).toLocaleString('en-IN')}`,
      icon: IndianRupee,
      color: 'emerald',
      subtitle: 'Settled payments collected',
    },
    {
      title: 'Pending Payments',
      value: metrics?.pendingPayments || 0,
      icon: Clock,
      color: 'rose',
      subtitle: 'Orders awaiting full settlement',
    },
    {
      title: 'Outstanding Balance',
      value: `₹${(metrics?.outstandingAmount || 0).toLocaleString('en-IN')}`,
      icon: AlertCircle,
      color: 'amber',
      subtitle: 'Receivables due from clients',
    },
    {
      title: 'Open Tasks',
      value: metrics?.openTasks || 0,
      icon: CheckSquare,
      color: 'cyan',
      subtitle: 'Action items pending completion',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
          <Filter className="w-4 h-4 text-sky-400" />
          <span>Operational Filters</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Branch filter */}
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="">All Branches</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Global">Global HQ</option>
          </select>

          {/* Date range filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-slate-750 transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all hover:shadow-lg group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{c.title}</span>
                <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-100 tracking-tight">
                {c.value}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{c.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Pipeline & Operational Health Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Pipeline */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Lead Sales Pipeline
            </h3>
            <span className="text-[11px] text-slate-400">Total: {metrics?.newLeads || 0}</span>
          </div>

          <div className="space-y-2.5">
            {Object.entries(pipeline).map(([stage, count]) => {
              const max = metrics?.newLeads || 1;
              const pct = Math.round((count / (max || 1)) * 100);
              return (
                <div key={stage} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">{stage}</span>
                    <span className="text-slate-200 font-semibold">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stage === 'WON'
                          ? 'bg-emerald-500'
                          : stage === 'LOST'
                          ? 'bg-rose-500'
                          : 'bg-sky-500'
                      }`}
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Fulfillment Status */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Order Fulfillment Breakdown
            </h3>
            <span className="text-[11px] text-slate-400">Total: {metrics?.totalOrders || 0}</span>
          </div>

          <div className="space-y-3">
            {Object.entries(orderStatus).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status === 'COMPLETED'
                        ? 'bg-emerald-400'
                        : status === 'PROCESSING'
                        ? 'bg-sky-400'
                        : status === 'CANCELLED'
                        ? 'bg-rose-400'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-xs font-medium text-slate-300">{status}</span>
                </div>
                <span className="text-xs font-bold text-slate-100">{count} orders</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Operational Audit Feed */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Live Audit Activity Feed
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-72 pr-1">
            {recentAudits.map((a) => (
              <div
                key={a.id}
                className="p-2.5 rounded-lg bg-slate-850/60 border border-slate-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-sky-400">{a.userName}</span>
                  <span className="text-slate-400">
                    {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-200 leading-snug">{a.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
