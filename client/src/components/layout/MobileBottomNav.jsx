import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Ticket, Network, Users } from 'lucide-react';

const mobileNavItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', path: '/tasks', icon: Ticket },
  { name: 'Divisions', path: '/divisions', icon: Network },
  { name: 'Clients', path: '/clients', icon: Users },
];

export default function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2 px-4 flex justify-around items-center z-30 shadow-lg">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-[#0EA5E9]' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">{item.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
