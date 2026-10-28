import { api } from "../api/api.js";

const FILENAME_PATTERN = /filename="?([^";]+)"?/i;

export const getServiceHistory = async (params = {}) => {
  const response = await api.get("/service-history", { params });
  const result = response.data?.data;

  if (!Array.isArray(result?.history))
    throw new Error("Format respons riwayat servis tidak valid.");

  return result;
};

async function readBlobErrorMessage(error) {
  const data = error.response?.data;
  if (!(data instanceof Blob)) return null;

  try {
    const parsed = JSON.parse(await data.text());
    return parsed?.message || null;
  } catch {
    return null;
  }
}

export const exportServiceHistory = async (params = {}) => {
  try {
    const response = await api.get("/service-history/export", {
      params,
      responseType: "blob",
    });

    const disposition = response.headers?.["content-disposition"] || "";
    const filename =
      disposition.match(FILENAME_PATTERN)?.[1] || "service-history.csv";
    // Server membatasi jumlah baris export; header ini menandai hasil terpotong.
    const truncated = response.headers?.["x-export-truncated"] === "true";
    const total = Number(response.headers?.["x-export-total"]) || null;

    return { blob: response.data, filename, truncated, total };
  } catch (error) {
    const message = await readBlobErrorMessage(error);
    if (message) error.message = message;
    throw error;
  }
};
