import { api } from "../api/api.js";

function emptyClientPage(params = {}) {
  return {
    clients: [],
    pagination: {
      page: Number(params.page) || 1,
      limit: Number(params.limit) || 20,
      total: 0,
      totalPages: 0,
    },
  };
}

export const getClients = async (params = {}) => {
  try {
    const response = await api.get("/clients", { params });
    const result = response.data?.data;

    if (!Array.isArray(result?.clients))
      throw new Error("Format respons daftar klien tidak valid.");

    return result;
  } catch (error) {
    if (error.response?.status === 404) return emptyClientPage(params);
    throw error;
  }
};

export const getClientById = async (clientId) => {
  const response = await api.get(`/clients/${clientId}`);
  return response.data?.data;
};
