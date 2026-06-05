import { createClient } from "@/lib/supabase/server";

/**
 * Shared Server Action auth guard. Returns the request-bound Supabase client
 * and the authenticated user, or throws. Server-only (uses request cookies).
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}
