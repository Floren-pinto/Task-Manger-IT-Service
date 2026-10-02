import { supabase } from "./supabaseClient";
import { api } from "../api/api.js";

export async function getSession() {
  return await supabase.auth.getSession();
}

export async function getUserProfile() {
  const response = await api.get("/auth/me");
  return response.data?.data;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function signInService(email, password) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOutService() {
  return await supabase.auth.signOut();
}
