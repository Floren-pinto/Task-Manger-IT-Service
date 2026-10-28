import { useState, useEffect, useCallback } from "react";
import { getTaskById } from "../services/taskService.js";
import { getErrorMessage } from "../utils/errorMessage.js";

export const useTaskDetail = (taskId) => {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTaskDetail = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getTaskById(taskId);
      setTask(response);
    } catch (err) {
      setError(getErrorMessage(err, "Gagal memuat detail tugas."));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTaskDetail();
  }, [fetchTaskDetail]);

  return { task, loading, error, refetch: fetchTaskDetail };
};
