import { createClient } from "@supabase/supabase-js";
import { env } from "../utils/env.js";

export const supabase = createClient(env.supabaseUrl, env.apiKey);
