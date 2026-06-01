import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncAccount } from "@/lib/instagram-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Nightly batch sync (Vercel Cron, see vercel.json). Refreshes tokens nearing
 * expiry and re-pulls follower counts + recent media for every connected
 * account. Protected by a shared secret: Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}` automatically.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: accounts, error } = await supabase
    .from("instagram_accounts")
    .select("id, artist_id, access_token_encrypted, token_expires_at");

  if (error) {
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  let synced = 0;
  let disconnected = 0;
  let failed = 0;

  for (const account of accounts ?? []) {
    try {
      const result = await syncAccount(supabase, account);
      if (result.ok) synced++;
      else disconnected++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    total: accounts?.length ?? 0,
    synced,
    disconnected,
    failed,
  });
}
