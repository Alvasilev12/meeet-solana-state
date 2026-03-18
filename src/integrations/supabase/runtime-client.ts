import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type RuntimeEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

const runtimeEnv = (globalThis as { __APP_ENV__?: RuntimeEnv }).__APP_ENV__;

export const SUPABASE_URL =
  runtimeEnv?.VITE_SUPABASE_URL ?? "https://zujrmifaabkletgnpoyw.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  runtimeEnv?.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1anJtaWZhYWJrbGV0Z25wb3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzI5NDcsImV4cCI6MjA4OTMwODk0N30.LBtODIT4DzfQKAcTWI9uvOXOksJPegjUxZmT4D56OQs";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
