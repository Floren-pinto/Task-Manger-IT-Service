import { getServiceHistory } from "../services/serviceHistoryService.js";
import { useApiData } from "./useApiData.js";

export function useServiceHistory(params = {}) {
  const { data, loading, error, refetch } = useApiData(
    getServiceHistory,
    params,
    { history: [], pagination: null },
    "Gagal memuat riwayat servis.",
  );

  return {
    history: Array.isArray(data?.history) ? data.history : [],
    pagination: data?.pagination ?? null,
    loading,
    error,
    refetch,
  };
}
