import { api } from "../api/api.js";
import { supabase } from "./supabaseClient.js";

export const getUsers = async (params = {}) => {
  const response = await api.get("/users", { params });
  const result = response.data?.data;

  if (!Array.isArray(result))
    throw new Error("Format respons daftar pengguna tidak valid.");

  return result;
};

export const createUser = async (payload) => {
  const response = await api.post("/users", payload);
  return response.data?.data;
};

export const updateUser = async (userId, payload) => {
  const response = await api.patch(`/users/${userId}`, payload);
  return response.data?.data;
};

export const resetPassword = async (email) => {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/reset-password`
      : undefined;

  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
};
