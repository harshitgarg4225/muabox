import { NextResponse } from "next/server";
import { parseSignedRequest } from "@/lib/meta-signed-request";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Fired by Meta when a user removes the app from Instagram.
 * Disconnect the account and stop the artist from receiving deals.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const signed = String(form.get("signed_request") ?? "");
    const payload = parseSignedRequest(signed);
    const igUserId = String(payload.user_id);

    const supabase = createAdminClient();

    const { data: account } = await supabase
      .from("instagram_accounts")
      .select("id, artist_id")
      .eq("ig_user_id", igUserId)
      .maybeSingle();

    if (account) {
      await supabase
        .from("artists")
        .update({ accepting_deals: false })
        .eq("id", account.artist_id);
      await supabase.from("instagram_accounts").delete().eq("id", account.id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
