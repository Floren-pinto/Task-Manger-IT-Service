import { api } from "../api/api.js";

export const getTasks = async () => {
  const response = await api.get("/tasks");
  const result = response.data?.data;

  if (!Array.isArray(result?.tasks)) {
    throw new Error("Format respons daftar tugas tidak valid.");
  }

  return result;
};

export const getTaskById = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}`);
  return response.data?.data;
};

export const updateStatusTask = async (taskId, newStatus) => {
  const response = await api.patch(`/tasks/${taskId}/status`, { newStatus });
  return response.data?.data;
};
