import { api } from "../api/api.js";

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
