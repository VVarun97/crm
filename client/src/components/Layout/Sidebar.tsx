import React from 'react';
import {
  LayoutDashboard,
  Users,
  Target,
  ShoppingCart,
  CreditCard,
  CheckSquare,
  ShieldCheck,
  Building2,
  Database,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenScaleModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, onOpenScaleModal }) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'leads', label: 'Leads', icon: Target },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    ...(user?.role !== 'EXECUTIVE'
      ? [{ id: 'audit', label: 'Audit Trail', icon: ShieldCheck }]
      : []),
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col flex-shrink-0 backdrop-blur-md">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight bg-gradient-to-r from-sky-400 to-indigo-300 bg-clip-text text-transparent">
            NexCRM
          </span>
          <span className="block text-[10px] text-slate-400 font-medium tracking-wider uppercase">
            Ops Enterprise
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* 5M Scale & Architecture Trigger Button */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={onOpenScaleModal}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 text-xs font-medium hover:bg-indigo-900/50 transition-colors"
        >
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>5M+ Scale & Arch Specs</span>
        </button>
      </div>

      {/* User Info Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-sky-400">
            {user?.fullName.slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.fullName}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
