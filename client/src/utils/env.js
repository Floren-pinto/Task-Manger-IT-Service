import dotenv from "dotenv";
dotenv.config();

function required(key) {
  const value = process.env[key];
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
