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
  port: parseInt(process.env.PORT || "3000"),
  supabaseProjectUrl: required("SUPABASE_PROJECT_URL"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),

  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
};
