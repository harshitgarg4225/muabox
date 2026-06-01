import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client that BYPASSES Row Level Security.
 * Server-only. Use exclusively for trusted backend work where there is no user
 * session — Meta deauthorize / data-deletion callbacks and the cron sync job.
 * Never import this into client code.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
