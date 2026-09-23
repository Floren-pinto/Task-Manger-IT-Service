function required(key) {
  const value =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) ??
    (typeof process !== "undefined" && process.env ? process.env[key] : undefined);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  supabaseUrl: required("VITE_SUPABASE_PROJECT_URL"),
  supabaseServiceRoleKey: required("VITE_SUPABASE_SERVICE_ROLE_KEY"),

  apiUrl: required("VITE_API_URL"),
  apiHealth: required("VITE_API_HEALTH"),
  apiKey: required("VITE_SUPABASE_ANON_KEY"),
};

