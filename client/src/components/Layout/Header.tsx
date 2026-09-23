import React, { useState } from 'react';
import {
  LogOut,
  Shield,
  ChevronDown,
  UserCheck,
  Check,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface HeaderProps {
  currentTab: string;
  onOpenSimulator: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onOpenSimulator }) => {
  const { user, logout, switchRole } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const roleColors: Record<UserRole, string> = {
    ADMIN: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    MANAGER: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    EXECUTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  };

  const roles: { role: UserRole; name: string; desc: string }[] = [
    { role: 'ADMIN', name: 'Rajesh Kumar (Admin)', desc: 'Full System Access & Audit' },
    { role: 'MANAGER', name: 'Amit Sharma (Manager)', desc: 'Branch & Team Management' },
    { role: 'EXECUTIVE', name: 'Rahul Verma (Executive)', desc: 'Assigned Records Only' },
  ];

  return (
    <header className="h-16 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-8 backdrop-blur-md sticky top-0 z-30">
      {/* Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-100 capitalize">
          {currentTab.replace('-', ' ')}
        </h1>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          Branch: {user?.branch || 'Mumbai'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Concurrency Simulator Button */}
        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 text-xs font-semibold transition-all shadow-sm"
          title="Simulate Employee A vs Employee B race condition"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span>Test Concurrency Race (₹50k → ₹55k/₹60k)</span>
        </button>

        {/* Quick Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-750 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Role:</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border ${
                user?.role ? roleColors[user.role] : ''
              }`}
            >
              {user?.role}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-750 rounded-xl shadow-2xl p-2 z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                Switch Demo User Role
              </div>
              {roles.map((r) => (
                <button
                  key={r.role}
                  onClick={async () => {
                    await switchRole(r.role);
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                    user?.role === r.role
                      ? 'bg-sky-500/15 text-sky-300 font-medium'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-[10px] text-slate-400">{r.desc}</p>
                  </div>
                  {user?.role === r.role && <Check className="w-4 h-4 text-sky-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
