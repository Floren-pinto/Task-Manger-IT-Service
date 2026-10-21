import { getAssets } from "../services/assetService.js";
import { useApiData } from "./useApiData.js";

export function useAssets(params = {}) {
  const { data, loading, error, refetch } = useApiData(
    getAssets,
    params,
    { assets: [], pagination: null },
    "Gagal memuat daftar aset.",
  );

  return {
    assets: Array.isArray(data?.assets) ? data.assets : [],
    pagination: data?.pagination ?? null,
    loading,
    error,
    refetch,
  };
}
