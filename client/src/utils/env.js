function required(key) {
  const value = import.meta.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  supabaseUrl: required("VITE_SUPABASE_PROJECT_URL"),
  apiKey: required("VITE_SUPABASE_ANON_KEY"),
  apiUrl: required("VITE_API_URL"),
};
