import { useCallback, useEffect, useState } from "react";
import { getUsers } from "../services/userService.js";

export const useUsers = (params = {}) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const paramsKey = JSON.stringify(params);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getUsers(JSON.parse(paramsKey));
      setUsers(result);
      return result;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Gagal memuat daftar pengguna.";
      setError(errorMessage);
      setUsers([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
};
