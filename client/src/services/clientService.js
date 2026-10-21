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

export const getClientById = async (clientId, params = {}) => {
  const response = await api.get(`/clients/${clientId}`, { params });
  return response.data?.data;
};

export const createClient = async (payload) => {
  const response = await api.post("/clients", payload);
  return response.data?.data;
};

export const updateClient = async (clientId, payload) => {
  const response = await api.patch(`/clients/${clientId}`, payload);
  return response.data?.data;
};

export const deleteClient = async (clientId) => {
  const response = await api.patch(`/clients/${clientId}`, { deleted: true });
  return response.data?.data;
};

export const restoreClient = async (clientId) => {
  const response = await api.patch(`/clients/${clientId}`, { deleted: false });
  return response.data?.data;
};
