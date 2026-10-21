import { useCallback } from "react";
import { getClientById } from "../services/clientService.js";
import { useApiData } from "./useApiData.js";

export function useClientDetail(clientId) {
  const fetchClient = useCallback(async ({ clientId: id }) => {
    if (!id) return null;
    return getClientById(id);
  }, []);

  const { data, loading, error, refetch } = useApiData(
    fetchClient,
    { clientId: clientId ?? "" },
    null,
    "Gagal memuat detail klien.",
  );

  return {
    client: data,
    assets: Array.isArray(data?.assets) ? data.assets : [],
    loading,
    error,
    refetch,
  };
}
