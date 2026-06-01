import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncAccount } from "@/lib/instagram-sync";

export const dynamic = "force-dynamic";

/**
 * Manual "Refresh stats" for the signed-in artist's own account.
 * Auth is enforced via the user session; the sync itself runs with the
 * service-role client because it rotates the encrypted token.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("instagram_accounts")
    .select("id, artist_id, access_token_encrypted, token_expires_at")
    .eq("artist_id", user.id)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "no_account" }, { status: 404 });
  }

  try {
    const result = await syncAccount(admin, account);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 409 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
