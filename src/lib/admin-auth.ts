import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

/** Bootstrap admins via env (comma-separated emails), before is_admin is set. */
export function emailIsAllowlisted(email?: string | null) {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

export function isAdminProfile(
  profile: Profile | null,
  userEmail?: string | null
) {
  if (profile?.is_admin) return true;
  return emailIsAllowlisted(profile?.email ?? userEmail);
}

export async function getAdminContext() {
  const { user, profile } = await getUserAndProfile();
  const admin = isAdminProfile(profile, user?.email);
  return { user, profile, isAdmin: !!user && admin };
}

/** Gate an admin route. Returns a service-role client for cross-tenant reads. */
export async function requireAdmin() {
  const { user, profile, isAdmin } = await getAdminContext();
  if (!user) redirect("/login");
  if (!isAdmin) redirect("/dashboard");
  return { user, profile, admin: createAdminClient() };
}
