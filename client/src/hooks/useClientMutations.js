import { useCallback, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import {
  createClient as createClientService,
  deleteClient as deleteClientService,
  restoreClient as restoreClientService,
  updateClient as updateClientService,
} from "../services/clientService.js";
import { emitClientsChanged } from "../utils/clientEvents.js";

export function useClientMutations() {
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
          "Gagal menyimpan data klien.";
        setError(message);
        toast.error(message);
        throw requestError;
      } finally {
        setSubmitting(false);
      }
    },
    [toast],
  );

  const createClient = useCallback(
    (payload) =>
      run(() => createClientService(payload), "Client berhasil dibuat."),
    [run],
  );

  const updateClient = useCallback(
    (clientId, payload) =>
      run(
        () => updateClientService(clientId, payload),
        "Client berhasil diperbarui.",
      ),
    [run],
  );

  const deleteClient = useCallback(
    (clientId) =>
      run(
        () => deleteClientService(clientId),
        "Client berhasil diarsipkan.",
      ),
    [run],
  );

  const restoreClient = useCallback(
    (clientId) =>
      run(
        () => restoreClientService(clientId),
        "Client berhasil dipulihkan.",
      ),
    [run],
  );

  return {
    createClient,
    updateClient,
    deleteClient,
    restoreClient,
    submitting,
    error,
  };
}
