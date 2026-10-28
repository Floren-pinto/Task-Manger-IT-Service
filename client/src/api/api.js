import axios from "axios";
import { supabase } from "../services/supabaseClient.js";
import { env } from "../utils/env.js";

const api = axios.create({
  baseURL: env.apiUrl,
});

api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return config;
});

// attachProfile membalas 403 dengan pesan ini bila akun dinonaktifkan/diarsip.
function isInactiveAccountError(error) {
  return (
    error.response?.status === 403 &&
    error.response?.data?.message === "Account is inactive"
  );
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const inactive = isInactiveAccountError(error);

    if (error.response?.status === 401 || inactive) {
      await supabase.auth.signOut();

      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.assign(inactive ? "/login?notice=inactive" : "/login");
      }
    }

    return Promise.reject(error);
  },
);

export { api };
