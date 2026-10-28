import React from "react";
import { NavLink } from "react-router-dom";
import {
  History,
  LayoutDashboard,
  Ticket,
  Network,
  Users,
  UserCog,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const desktopItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Tasks", path: "/tasks", icon: Ticket },
  { name: "Divisions", path: "/divisions", icon: Network },
  { name: "Clients", path: "/clients", icon: Users },
  { name: "History", path: "/service-history", icon: History },
];

const usersItem = { name: "Users", path: "/users", icon: UserCog };

export default function MobileBottomNav() {
  const { role } = useAuth();
  const isSuperAdmin = role === "SUPER_ADMIN";

  const mobileNavItems = isSuperAdmin
    ? desktopItems.map((item) =>
        item.path === "/divisions" ? usersItem : item,
      )
    : desktopItems;

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
                isActive ? "text-[#0EA5E9]" : "text-slate-400 hover:text-slate-600"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">
              {item.name}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
