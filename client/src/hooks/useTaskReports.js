import { getTaskReports } from "../services/serviceReportService.js";
import { useApiData } from "./useApiData.js";

const fetchTaskReports = ({ taskId }) =>
  taskId ? getTaskReports(taskId) : Promise.resolve([]);

export function useTaskReports(taskId) {
  const { data, loading, error, refetch } = useApiData(
    fetchTaskReports,
    { taskId: taskId ?? "" },
    [],
    "Gagal memuat laporan servis.",
  );

  return {
    reports: Array.isArray(data) ? data : [],
    loading,
    error,
    refetch,
  };
}
