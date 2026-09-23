import { supabase } from "./supabaseClient";

export async function getSession() {
  return await supabase.auth.getSession();
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
