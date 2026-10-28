import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Loading } from "../components/Loading";

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

// Selalu dipasang di dalam ProtectedRoute, jadi profil sudah dimuat di sini.
export function AdminRoute() {
  const { role } = useAuth();

  if (role !== "SUPER_ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export function PublicRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (isAuthenticated) {
    const from = location.state?.from;
    // Search ikut disimpan agar filter di URL tidak hilang setelah login.
    const target = from ? `${from.pathname}${from.search ?? ""}` : "/dashboard";
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}
