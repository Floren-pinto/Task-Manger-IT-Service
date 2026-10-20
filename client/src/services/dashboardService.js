import { api } from "../api/api.js";

export const getDashboardSummary = async () => {
  const response = await api.get("/dashboard/summary");
  const result = response.data?.data;

  if (!result || typeof result !== "object")
    throw new Error("Format respons ringkasan dashboard tidak valid.");

  return result;
};
