import { api } from "../api/api.js";

export const getTaskReports = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}/reports`);
  const result = response.data?.data;

  if (!Array.isArray(result))
    throw new Error("Format respons laporan servis tidak valid.");

  return result;
};

export const createTaskReport = async (taskId, payload) => {
  const response = await api.post(`/tasks/${taskId}/reports`, payload);
  return response.data?.data;
};

export const getTaskReport = async (taskId, reportId) => {
  const response = await api.get(`/tasks/${taskId}/reports/${reportId}`);
  return response.data?.data;
};

export const getServiceReport = async (reportId) => {
  const response = await api.get(`/service-reports/${reportId}`);
  return response.data?.data;
};
