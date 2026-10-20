import { getTasks } from "../services/taskService.js";
import { useApiData } from "./useApiData.js";

export function useTasks(params = {}) {
  const { data, loading, error, refetch } = useApiData(
    getTasks,
    params,
    { tasks: [], pagination: null },
    "Gagal memuat daftar tugas.",
  );

  return {
    tasks: Array.isArray(data?.tasks) ? data.tasks : [],
    pagination: data?.pagination ?? null,
    loading,
    error,
    refetch,
  };
}
