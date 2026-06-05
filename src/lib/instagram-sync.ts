import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken, encryptToken } from "@/lib/crypto";
import {
  fetchProfile,
  fetchRecentMedia,
  refreshLongLivedToken,
  engagementRate,
  InstagramError,
  type IgMedia,
} from "@/lib/instagram";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function mediaRows(accountId: string, media: IgMedia[]) {
  return media.map((m) => ({
    instagram_account_id: accountId,
    ig_media_id: m.id,
    caption: m.caption ?? null,
    media_type: m.media_type ?? null,
    media_url: m.media_url ?? null,
    thumbnail_url: m.thumbnail_url ?? null,
    permalink: m.permalink ?? null,
    like_count: m.like_count ?? null,
    comments_count: m.comments_count ?? null,
    posted_at: m.timestamp ?? null,
  }));
}

type SyncableAccount = {
  id: string;
  artist_id: string;
  access_token_encrypted: string;
  token_expires_at: string | null;
};

/**
 * Refresh one connected account: rotate the token if it is close to expiry,
 * re-fetch profile + recent media, and replace the stored media rows.
 * Handles revoked tokens by marking the artist as not accepting deals.
 * Requires a service-role client (writes the encrypted token column).
 */
export async function syncAccount(
  supabase: SupabaseClient,
  account: SyncableAccount
) {
  let token: string;
  try {
    token = decryptToken(account.access_token_encrypted);
  } catch {
    return { ok: false as const, reason: "decrypt_failed" };
  }

  const update: Record<string, unknown> = {};

  // Rotate token when within 7 days of expiry.
  const expiresAt = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : 0;
  if (expiresAt && expiresAt - Date.now() < SEVEN_DAYS_MS) {
    try {
      const refreshed = await refreshLongLivedToken(token);
      token = refreshed.access_token;
      update.access_token_encrypted = encryptToken(token);
      update.token_expires_at = new Date(
        Date.now() + refreshed.expires_in * 1000
      ).toISOString();
    } catch (err) {
      if (err instanceof InstagramError && err.status >= 400 && err.status < 500) {
        return await markDisconnected(supabase, account);
      }
      throw err;
    }
  }

  // Re-fetch profile + media.
  try {
    const profile = await fetchProfile(token);
    const media = await fetchRecentMedia(token, 12);

    Object.assign(update, {
      username: profile.username ?? null,
      account_type: profile.account_type ?? null,
      followers_count: profile.followers_count ?? null,
      follows_count: profile.follows_count ?? null,
      media_count: profile.media_count ?? null,
      profile_picture_url: profile.profile_picture_url ?? null,
      biography: profile.biography ?? null,
      website: profile.website ?? null,
      engagement_rate: engagementRate(media, profile.followers_count),
      last_synced_at: new Date().toISOString(),
    });

    await supabase
      .from("instagram_accounts")
      .update(update)
      .eq("id", account.id);

    // Replace media rows.
    await supabase
      .from("instagram_media")
      .delete()
      .eq("instagram_account_id", account.id);
    if (media.length) {
      await supabase.from("instagram_media").insert(mediaRows(account.id, media));
    }

    return { ok: true as const };
  } catch (err) {
    if (err instanceof InstagramError && err.status >= 400 && err.status < 500) {
      return await markDisconnected(supabase, account);
    }
    throw err;
  }
}

async function markDisconnected(
  supabase: SupabaseClient,
  account: SyncableAccount
) {
  await supabase
    .from("artists")
    .update({ accepting_deals: false })
    .eq("id", account.artist_id);
  await supabase.from("instagram_accounts").delete().eq("id", account.id);
  return { ok: false as const, reason: "revoked" };
}
