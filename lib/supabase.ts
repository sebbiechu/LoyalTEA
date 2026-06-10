import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return url;
}

function getAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  return key;
}

export function createServiceClient() {
  const url = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createBrowserClient() {
  return createClient(getSupabaseUrl(), getAnonKey());
}
