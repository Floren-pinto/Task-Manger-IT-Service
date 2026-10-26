import { getUsers } from "../services/userService.js";
import { useApiData } from "./useApiData.js";

export function useUsers(params = {}) {
  const { data, loading, error, refetch } = useApiData(
    getUsers,
    params,
    [],
    "Gagal memuat daftar pengguna.",
  );

  return {
    users: Array.isArray(data) ? data : [],
    loading,
    error,
    refetch,
  };
}
