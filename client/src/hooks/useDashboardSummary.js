import { getDashboardSummary } from "../services/dashboardService.js";
import { useApiData } from "./useApiData.js";

export function useDashboardSummary() {
  const { data, loading, error, refetch } = useApiData(
    getDashboardSummary,
    {},
    null,
    "Gagal memuat ringkasan dashboard.",
  );

  return {
    summary: data,
    loading,
    error,
    refetch,
  };
}
