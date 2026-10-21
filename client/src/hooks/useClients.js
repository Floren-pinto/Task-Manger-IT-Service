import { getClients } from "../services/clientService.js";
import { useApiData } from "./useApiData.js";

export function useClients(params = {}) {
  const { data, loading, error, refetch } = useApiData(
    getClients,
    params,
    { clients: [], pagination: null },
    "Gagal memuat daftar klien.",
  );

  return {
    clients: Array.isArray(data?.clients) ? data.clients : [],
    pagination: data?.pagination ?? null,
    loading,
    error,
    refetch,
  };
}
