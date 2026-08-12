import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.local.example to .env.local and fill it in.`,
    );
  }
  return value;
}

let client: SupabaseClient | null = null;

// Server-only client using the Supabase service role key. Never import
// this file from a Client Component - it must only run on the server.
// Lazily created (instead of at module scope) so builds and unrelated
// requests don't fail before real credentials are configured.
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } },
    );
  }
  return client;
}
