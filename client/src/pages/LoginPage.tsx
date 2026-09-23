import React, { useState } from 'react';
import { Building2, Shield, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed demo login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 items-center justify-center text-white shadow-xl shadow-sky-500/20 mb-1">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 to-indigo-300 bg-clip-text text-transparent">
            NexCRM Enterprise
          </h1>
          <p className="text-xs text-slate-400">
            Operations Management System with Concurrency & Scalability
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-600/50 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="admin@crm.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick 1-Click Demo Accounts */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block text-center">
              1-Click Demo Evaluation Logins
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@crm.local', 'Admin@123')}
                className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-center transition-colors"
              >
                <p className="font-bold text-[11px]">Admin</p>
                <p className="text-[9px] text-slate-400">Full System</p>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('manager@crm.local', 'Manager@123')}
                className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-center transition-colors"
              >
                <p className="font-bold text-[11px]">Manager</p>
                <p className="text-[9px] text-slate-400">Branch Ops</p>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('executive@crm.local', 'Exec@123')}
                className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-center transition-colors"
              >
                <p className="font-bold text-[11px]">Executive</p>
                <p className="text-[9px] text-slate-400">Sales Rep</p>
              </button>
            </div>
          </div>
        </div>

        {/* Security Badges */}
        <div className="flex items-center justify-center gap-6 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            JWT & RBAC Protected
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            Bcrypt Hashed
          </span>
        </div>
      </div>
    </div>
  );
};
