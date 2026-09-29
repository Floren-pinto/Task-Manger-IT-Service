import { useState, useEffect } from "react";
import { getTaskById } from "../services/taskService.js";

export const useTaskDetail = (taskId) => {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTaskDetail = async () => {
      setLoading(true);
      try {
        const response = await getTaskById(taskId);
        setTask(response);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      fetchTaskDetail();
    }
  }, [taskId]);

  return { task, loading, error };
};
