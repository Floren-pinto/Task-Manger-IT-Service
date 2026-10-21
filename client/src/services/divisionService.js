import { api } from "../api/api.js";

export const getDivisions = async () => {
  const response = await api.get("/divisions");
  const result = response.data?.data;

  if (!Array.isArray(result))
    throw new Error("Format respons daftar divisi tidak valid.");

  return result;
};
