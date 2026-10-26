import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ProtectedRoute, PublicRoute, AdminRoute } from "./RouteGuards";

// Layouts
import PublicLayout from "../layouts/PublicLayout";
import DashboardLayout from "../layouts/DashboardLayout";

// Pages
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import GenericPage from "../pages/GenericPage";
import TasksPage from "../pages/TasksPage";
import ClientsPage from "../pages/ClientsPage";
import UsersPage from "../pages/UsersPage";
import { ClientDetailDrawer } from "../components/clients/ClientDetailDrawer";
import { TaskDetailPage } from "../pages/TaskDetailPage";

export default function AppRoutes() {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation || location}>
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
            <Route path="/tasks/:id" element={<TaskDetailPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route
              path="/divisions"
              element={
                <GenericPage
                  title="Divisions"
                  description="Network Admin, PC Repair, dan manajemen tim"
                />
              }
            />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:clientId" element={<ClientDetailDrawer />} />
            <Route element={<AdminRoute />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
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
            <div className="flex min-h-screen flex-col items-center justify-center text-slate-700">
              <h1 className="text-4xl font-bold">404</h1>
              <p className="mt-2 text-sm">Halaman tidak ditemukan.</p>
              <a href="/" className="mt-4 text-sm text-[#0EA5E9] underline">
                Kembali ke Beranda
              </a>
            </div>
          }
        />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/tasks/:id" element={<TaskDetailPage />} />
            <Route path="/clients/:clientId" element={<ClientDetailDrawer />} />
          </Route>
        </Routes>
      )}
    </>
  );
}
