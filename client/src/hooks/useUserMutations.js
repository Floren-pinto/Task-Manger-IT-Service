import { useCallback, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import {
  createUser as createUserService,
  updateUser as updateUserService,
} from "../services/userService.js";

export function useUserMutations() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (action, successMessage) => {
      setSubmitting(true);
      setError(null);

      try {
        const result = await action();
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (requestError) {
        const message =
          requestError.response?.data?.message ||
          requestError.message ||
          "Gagal menyimpan data pengguna.";
        setError(message);
        toast.error(message);
        throw requestError;
      } finally {
        setSubmitting(false);
      }
    },
    [toast],
  );

  const createUser = useCallback(
    (payload) =>
      run(() => createUserService(payload), "Pengguna berhasil dibuat."),
    [run],
  );

  const updateUser = useCallback(
    (userId, payload) =>
      run(
        () => updateUserService(userId, payload),
        "Data pengguna berhasil diperbarui.",
      ),
    [run],
  );

  return {
    createUser,
    updateUser,
    submitting,
    error,
  };
}
