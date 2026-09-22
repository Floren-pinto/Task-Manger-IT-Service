import React from "react";
import { useToast } from "../contexts/ToastContext";
import { Plus, Search, MapPin } from "lucide-react";

export default function DashboardPage() {
  const toast = useToast();

  const handleTestToast = () => {
    toast.success("Tiket baru TC-9024 berhasil dibuat!");
  };

  return (
    <div className="space-y-6">
      {/* Header: Manager Workspace / TechPortal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 m-0">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 m-0 mt-1">
            Overview operasional tiket dan penugasan teknisi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestToast}
            className="w-full sm:w-auto px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Metric Cards: 3 Kolom di Desktop, 1 Kolom di Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Active Tasks */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Tasks
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">42 Active</span>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            +8% this week
          </p>
        </div>

        {/* Completed Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Completed Today
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              18 Resolved
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Avg resolve time: 1.4 hours
          </p>
        </div>

        {/* Staff Available */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm sm:col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Staff Available
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">6 On Duty</span>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-1">
            2 dispatch field engineers
          </p>
        </div>
      </div>

      {/* Filter & Search Bar: Horizontal Scrollable Pills di Mobile */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <button className="bg-[#0EA5E9] text-white rounded-lg md:rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap">
            All Tickets
          </button>
          <button className="bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition">
            Network Issue
          </button>
          <button className="bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition">
            PC Repair
          </button>
          <button className="bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition">
            Urgent
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search TC-9023..."
            className="border border-slate-300 rounded-lg pl-9 pr-4 py-1.5 text-xs sm:text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
          />
        </div>
      </div>

      {/* Content Responsive: Table di Desktop / Cards di Mobile */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop View: Table Grid */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Task Title & Client</th>
                <th className="py-3 px-4">Assigned Tech</th>
                <th className="py-3 px-4">Division</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Due Within</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <tr className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-semibold text-slate-900">
                  TC-9023
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-800">
                    Koneksi Fiber Optic Switch Drop
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    PT. Indah Jaya • Gedung Rektorat Lt. 3
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-600">Alex Rivers</td>
                <td className="py-3 px-4">
                  <span className="bg-sky-50 text-sky-600 px-2 py-0.5 rounded text-[11px] font-medium">
                    Network
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[11px] font-medium">
                    Baru
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-orange-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    Urgent
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500">2 Jam</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile View: Vertical Task Cards */}
        <div className="block md:hidden p-4 space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400">TC-9023</span>
              <div className="flex items-center gap-1.5">
                <span className="bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  HIGH
                </span>
                <span className="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Baru
                </span>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Koneksi Fiber Optic Switch Drop
            </h3>
            <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                PT. Indah Jaya • Gedung Rektorat Lt. 3
              </span>
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2.5 py-1 rounded-md">
                Jaringan
              </span>
              <span className="text-xs text-slate-500">Alex Rivers</span>
            </div>

            <button
              onClick={() => toast.info("Detail tiket TC-9023")}
              className="w-full bg-[#0EA5E9] active:bg-[#0284C7] text-white py-2 rounded-lg font-semibold text-xs transition"
            >
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
