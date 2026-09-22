import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './RouteGuards';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';

// Pages
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import GenericPage from '../pages/GenericPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicRoute />}>
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/tasks"
            element={
              <GenericPage
                title="Tasks & Tickets"
                description="Daftar semua penugasan tiket dan filter status"
              />
            }
          />
          <Route
            path="/divisions"
            element={
              <GenericPage
                title="Divisions"
                description="Network Admin, PC Repair, dan manajemen tim"
              />
            }
          />
          <Route
            path="/clients"
            element={
              <GenericPage
                title="Clients & Locations"
                description="Daftar klien, gedung, dan stasiun kerja"
              />
            }
          />
          <Route
            path="/reports"
            element={
              <GenericPage
                title="SLA Reports"
                description="Laporan kepatuhan SLA dan kecepatan resolusi tiket"
              />
            }
          />
        </Route>
      </Route>

      {/* Default & Catch All */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="*"
        element={
          <div className="flex flex-col items-center justify-center min-h-screen text-slate-700">
            <h1 className="text-4xl font-bold">404</h1>
            <p className="mt-2 text-sm">Halaman tidak ditemukan.</p>
            <a href="/" className="mt-4 text-[#0EA5E9] underline text-sm">
              Kembali ke Beranda
            </a>
          </div>
        }
      />
    </Routes>
  );
}
