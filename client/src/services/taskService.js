import { api } from "../api/api.js";

export const getTasks = async () => {
  const response = await api.get("/tasks");
  const result = response.data?.data;

  if (!Array.isArray(result?.tasks)) {
    throw new Error("Format respons daftar tugas tidak valid.");
  }

  return result;
};
