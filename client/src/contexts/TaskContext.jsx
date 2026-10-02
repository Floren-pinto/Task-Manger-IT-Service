import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { getTasks } from "../services/taskService.js";

export const TaskContext = createContext(null);

export const TaskProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const fetchTasks = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;

    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const result = await getTasks();
      if (requestId.current !== currentRequestId) return;

      setTasks(result.tasks);
      setPagination(result.pagination ?? null);
    } catch (requestError) {
      if (requestId.current !== currentRequestId) return;

      console.error("Error fetching tasks:", requestError);
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Terjadi kesalahan saat mengambil data tugas.",
      );
    } finally {
      if (requestId.current === currentRequestId) {
        setLoading(false);
      }
    }
  }, [authLoading, isAuthenticated]);

  const updateTaskLocally = useCallback((taskId, updatedFields) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, ...updatedFields } : task
      )
    );
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      requestId.current += 1;
      setTasks([]);
      setPagination(null);
      setError(null);
      setLoading(false);
      return;
    }

    void fetchTasks();
  }, [authLoading, isAuthenticated, fetchTasks]);

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );

  const value = {
    tasks,
    pagination,
    loading,
    error,
    onRefreshTasks: fetchTasks,
    updateTaskLocally,
  };
  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export function useTask() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTask must be used within a TaskProvider");
  }
  return context;
}
