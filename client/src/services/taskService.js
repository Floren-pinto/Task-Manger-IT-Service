import { api } from "../api/api.js";

export const getTasks = async () => {
  const response = await api.get("/tasks");
  const result = response.data?.data;

  if (!Array.isArray(result?.tasks))
    throw new Error("Format respons daftar tugas tidak valid.");
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

export const assignTask = async (taskId, userId) => {
  const response = await api.post(`/tasks/${taskId}/assignments`, { userId });
  return response.data?.data;
};

export const getTaskAttachments = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}/attachments`);
  return response.data?.data;
};

export const createTaskAttachment = async (taskId, payload) => {
  const response = await api.post(`/tasks/${taskId}/attachments`, payload);
  return response.data?.data;
};

export const deleteTaskAttachment = async (taskId, attachmentId) => {
  const response = await api.delete(
    `/tasks/${taskId}/attachments/${attachmentId}`,
  );
  return response.data?.data;
};
