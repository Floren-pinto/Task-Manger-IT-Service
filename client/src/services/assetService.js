import { api } from "../api/api.js";

function emptyAssetPage(params = {}) {
  return {
    assets: [],
    pagination: {
      page: Number(params.page) || 1,
      limit: Number(params.limit) || 20,
      total: 0,
      totalPages: 0,
    },
  };
}

export const getAssets = async (params = {}) => {
  try {
    const response = await api.get("/assets", { params });
    const result = response.data?.data;

    if (!Array.isArray(result?.assets))
      throw new Error("Format respons daftar aset tidak valid.");

    return result;
  } catch (error) {
    if (error.response?.status === 404) return emptyAssetPage(params);
    throw error;
  }
};

export const getAssetById = async (assetId) => {
  const response = await api.get(`/assets/${assetId}`);
  return response.data?.data;
};

export const createAsset = async (payload) => {
  const response = await api.post("/assets", payload);
  return response.data?.data;
};

export const updateAsset = async (assetId, payload) => {
  const response = await api.patch(`/assets/${assetId}`, payload);
  return response.data?.data;
};

export const deleteAsset = async (assetId) => {
  const response = await api.patch(`/assets/${assetId}`, { deleted: true });
  return response.data?.data;
};

export const restoreAsset = async (assetId) => {
  const response = await api.patch(`/assets/${assetId}`, { deleted: false });
  return response.data?.data;
};
