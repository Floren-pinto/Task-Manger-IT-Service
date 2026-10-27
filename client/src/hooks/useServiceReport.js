import {
  getServiceReport,
  getTaskReport,
} from "../services/serviceReportService.js";
import { useApiData } from "./useApiData.js";

const fetchServiceReport = ({ taskId, reportId }) => {
  if (!reportId) return Promise.resolve(null);
  return taskId ? getTaskReport(taskId, reportId) : getServiceReport(reportId);
};

export function useServiceReport({ taskId, reportId } = {}) {
  const { data, loading, error, refetch } = useApiData(
    fetchServiceReport,
    { taskId: taskId ?? "", reportId: reportId ?? "" },
    null,
    "Gagal memuat detail laporan servis.",
  );

  return { report: data, loading, error, refetch };
}
