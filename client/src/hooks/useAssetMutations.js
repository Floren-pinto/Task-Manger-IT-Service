import { useCallback, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import {
  createAsset as createAssetService,
  deleteAsset as deleteAssetService,
  restoreAsset as restoreAssetService,
  updateAsset as updateAssetService,
} from "../services/assetService.js";
import { emitClientsChanged } from "../utils/clientEvents.js";

export function useAssetMutations() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (action, successMessage) => {
      setSubmitting(true);
      setError(null);

      try {
        const result = await action();
        emitClientsChanged();
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (requestError) {
        const message =
          requestError.response?.data?.message ||
          requestError.message ||
          "Gagal menyimpan data aset.";
        setError(message);
        toast.error(message);
        throw requestError;
      } finally {
        setSubmitting(false);
      }
    },
    [toast],
  );

  const createAsset = useCallback(
    (payload) =>
      run(() => createAssetService(payload), "Aset berhasil ditambahkan."),
    [run],
  );

  const updateAsset = useCallback(
    (assetId, payload) =>
      run(
        () => updateAssetService(assetId, payload),
        "Aset berhasil diperbarui.",
      ),
    [run],
  );

  const deleteAsset = useCallback(
    (assetId) =>
      run(() => deleteAssetService(assetId), "Aset berhasil diarsipkan."),
    [run],
  );

  const restoreAsset = useCallback(
    (assetId) =>
      run(() => restoreAssetService(assetId), "Aset berhasil dipulihkan."),
    [run],
  );

  return {
    createAsset,
    updateAsset,
    deleteAsset,
    restoreAsset,
    submitting,
    error,
  };
}
