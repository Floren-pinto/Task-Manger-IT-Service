import { useCallback } from "react";
import { getClientById } from "../services/clientService.js";
import { useApiData } from "./useApiData.js";

export function useClientDetail(
  clientId,
  { includeDeletedAssets = false } = {},
) {
  const fetchClient = useCallback(async ({ clientId: id, ...params }) => {
    if (!id) return null;
    return getClientById(id, params);
  }, []);

  const { data, loading, error, refetch } = useApiData(
    fetchClient,
    includeDeletedAssets
      ? { clientId: clientId ?? "", includeDeletedAssets: true }
      : { clientId: clientId ?? "" },
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
