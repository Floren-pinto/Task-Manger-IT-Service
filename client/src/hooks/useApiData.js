import { useCallback, useEffect, useRef, useState } from "react";

export function useApiData(
  fetcher,
  params = {},
  initialData = null,
  fallbackError = "Gagal memuat data.",
) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const paramsKey = JSON.stringify(params);

  const refetch = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher(JSON.parse(paramsKey));
      if (requestId.current !== currentRequestId) return null;
      setData(result);
      return result;
    } catch (requestError) {
      if (requestId.current !== currentRequestId) return null;
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          fallbackError,
      );
      return null;
    } finally {
      if (requestId.current === currentRequestId) {
        setLoading(false);
      }
    }
  }, [fallbackError, fetcher, paramsKey]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );

  return { data, loading, error, refetch };
}
