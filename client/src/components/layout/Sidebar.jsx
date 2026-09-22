import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Network,
  Users,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const navigationLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks & Tickets', path: '/tasks', icon: Ticket },
  { name: 'Divisions', path: '/divisions', icon: Network },
  { name: 'Clients', path: '/clients', icon: Users },
  { name: 'SLA Reports', path: '/reports', icon: BarChart3 },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info('Anda telah keluar dari sistem.');
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex w-64 bg-[#0F172A] text-white flex-col h-screen shrink-0 border-r border-slate-800 select-none">
      {/* App Brand */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0EA5E9] flex items-center justify-center font-bold text-white shadow-sm">
            TC
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white m-0">IT Ops Center</h1>
            <p className="text-[11px] text-slate-400 font-medium m-0">TaskCore Management</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Main Menu
        </div>
        {navigationLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'bg-[#1E293B] text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#0EA5E9] rounded-r-full" />
                  )}
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#0EA5E9]' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile Footer Pin */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120'}
            alt={user?.name || 'User'}
            className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate m-0">
              {user?.name || 'Sarah Jenkins'}
            </p>
            <p className="text-[11px] text-slate-400 truncate m-0">
              {user?.roleTitle || 'Service Lead'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition shrink-0"
          title="Keluar"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
