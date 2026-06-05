import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchProfile,
  fetchRecentMedia,
  engagementRate,
} from "@/lib/instagram";

export const dynamic = "force-dynamic";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "";

function fail(reason: string) {
  return NextResponse.redirect(`${APP}/dashboard?ig_error=${reason}`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code) return fail("denied");

  // Verify CSRF state.
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("ig_oauth_state")?.value;
  cookieStore.delete("ig_oauth_state");
  if (!state || !expectedState || state !== expectedState) {
    return fail("state");
  }

  // Must be a logged-in artist.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP}/login`);

  try {
    // 1) code -> short-lived token
    const short = await exchangeCodeForToken(code);
    // 2) short-lived -> long-lived (60 days)
    const long = await exchangeForLongLivedToken(short.access_token);
    const expiresAt = new Date(
      Date.now() + long.expires_in * 1000
    ).toISOString();

    // 3) profile + 4) recent media
    const profile = await fetchProfile(long.access_token);
    const media = await fetchRecentMedia(long.access_token, 12);

    // 5) persist (RLS: artist owns their own rows)
    const { data: ig, error: upsertErr } = await supabase
      .from("instagram_accounts")
      .upsert(
        {
          artist_id: user.id,
          ig_user_id: String(profile.user_id ?? short.user_id),
          username: profile.username ?? null,
          account_type: profile.account_type ?? null,
          followers_count: profile.followers_count ?? null,
          follows_count: profile.follows_count ?? null,
          media_count: profile.media_count ?? null,
          profile_picture_url: profile.profile_picture_url ?? null,
          biography: profile.biography ?? null,
          website: profile.website ?? null,
          engagement_rate: engagementRate(media, profile.followers_count),
          access_token_encrypted: encryptToken(long.access_token),
          token_expires_at: expiresAt,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "artist_id" }
      )
      .select()
      .single();

    if (upsertErr || !ig) return fail("save");

    // Replace media rows.
    await supabase
      .from("instagram_media")
      .delete()
      .eq("instagram_account_id", ig.id);
    if (media.length) {
      await supabase.from("instagram_media").insert(
        media.map((m) => ({
          instagram_account_id: ig.id,
          ig_media_id: m.id,
          caption: m.caption ?? null,
          media_type: m.media_type ?? null,
          media_url: m.media_url ?? null,
          thumbnail_url: m.thumbnail_url ?? null,
          permalink: m.permalink ?? null,
          like_count: m.like_count ?? null,
          comments_count: m.comments_count ?? null,
          posted_at: m.timestamp ?? null,
        }))
      );
    }

    return NextResponse.redirect(`${APP}/dashboard?connected=1`);
  } catch {
    return fail("api");
  }
}
