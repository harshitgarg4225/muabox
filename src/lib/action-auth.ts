import { createClient } from "@/lib/supabase/server";

/**
 * Shared Server Action auth guard. Returns the request-bound Supabase client
 * and the authenticated user, or throws. Server-only (uses request cookies).
 *
 * Also blocks suspended accounts: suspension is otherwise only enforced at
 * render time in the (app) layout, which a suspended user could bypass by
 * replaying an action POST. Account deletion must still work while suspended
 * (data-rights), so it uses requireUserAllowSuspended() below.
 */
export async function requireUser() {
  const { supabase, user } = await requireUserAllowSuspended();
  const { data: profile } = await supabase
    .from("profiles")
    .select("suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.suspended) throw new Error("account_suspended");
  return { supabase, user };
}

/** Auth guard that does NOT block suspended users (e.g. account deletion). */
export async function requireUserAllowSuspended() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}
