import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// verification jwt
export const supabaseAnon = createClient(
  env.supabaseProjectUrl,
  env.supabaseAnonKey,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// client per-request
export function createUserClient(token) {
  return createClient(env.supabaseProjectUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// BYPASS RLS
export const supabaseAdmin = env.supabaseServiceRoleKey
  ? createClient(env.supabaseProjectUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
