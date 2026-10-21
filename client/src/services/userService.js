import { api } from "../api/api.js";

export const getUsers = async (params = {}) => {
  const response = await api.get("/users", { params });
  const result = response.data?.data;

  if (!Array.isArray(result))
    throw new Error("Format respons daftar pengguna tidak valid.");
  return result;
};
