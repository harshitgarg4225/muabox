import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { parseSignedRequest } from "@/lib/meta-signed-request";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "";

/**
 * Meta-required data deletion callback. Deletes the user's Instagram data and
 * returns a status URL + confirmation code that Meta surfaces to the user.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const signed = String(form.get("signed_request") ?? "");
    const payload = parseSignedRequest(signed);
    const igUserId = String(payload.user_id);

    const confirmationCode = crypto.randomBytes(12).toString("hex");

    const supabase = createAdminClient();

    const { data: account } = await supabase
      .from("instagram_accounts")
      .select("id, artist_id")
      .eq("ig_user_id", igUserId)
      .maybeSingle();

    if (account) {
      // instagram_media cascades on instagram_accounts delete.
      await supabase
        .from("artists")
        .update({ accepting_deals: false })
        .eq("id", account.artist_id);
      await supabase.from("instagram_accounts").delete().eq("id", account.id);
    }

    return NextResponse.json({
      url: `${APP}/data-deletion-status?id=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
