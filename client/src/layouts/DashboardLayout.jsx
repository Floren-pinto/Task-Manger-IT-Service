import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import MobileHeader from '../components/layout/MobileHeader';
import MobileBottomNav from '../components/layout/MobileBottomNav';

export default function DashboardLayout() {
  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-[#F8FAFC]">
      {/* Desktop Main Sidebar (Hidden on Mobile) */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Mobile Top Header (Hidden on Desktop) */}
        <MobileHeader />

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-8">
          <div className="p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar (Hidden on Desktop) */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
