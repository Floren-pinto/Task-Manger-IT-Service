import { getDivisions } from "../services/divisionService.js";
import { useApiData } from "./useApiData.js";

export function useDivisions() {
  const { data, loading, error, refetch } = useApiData(
    getDivisions,
    {},
    [],
    "Gagal memuat daftar divisi.",
  );

  return {
    divisions: Array.isArray(data) ? data : [],
    loading,
    error,
    refetch,
  };
}
