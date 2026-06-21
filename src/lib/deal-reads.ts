import type { SupabaseClient } from "@supabase/supabase-js";

/** The deal fields needed to compute and apply a read marker. */
export type ReadMarkerDeal = {
  id: string;
  brand_id: string;
  artist_id: string;
  status: string;
  initiated_by: string;
  last_message_at?: string | null;
  artist_read_at?: string | null;
  brand_read_at?: string | null;
};

/**
 * Stamp the viewer's read marker on a deal — but only write when something
 * actually changes. Shared by the deal-detail page (which already has the deal
 * + user loaded, so it avoids a second auth call and a second fetch) and the
 * markDealRead server action (called from sendMessage).
 *
 * Returns true if a write was issued.
 */
export async function applyReadMarker(
  supabase: SupabaseClient,
  deal: ReadMarkerDeal,
  userId: string
): Promise<boolean> {
  const isBrand = deal.brand_id === userId;
  if (!isBrand && deal.artist_id !== userId) return false; // not a participant

  // First time the RECEIVER opens a fresh offer/pitch, bump 'sent' -> 'viewed'.
  const isReceiver = deal.initiated_by === "artist" ? isBrand : !isBrand;
  const shouldBump = isReceiver && deal.status === "sent";

  // Skip the write when there's no status bump due AND the viewer's marker
  // already covers the latest activity (i.e. nothing new to mark read). This
  // avoids write-on-every-open without ever leaving a just-read deal looking
  // unread.
  const currentMarker = isBrand ? deal.brand_read_at : deal.artist_read_at;
  const alreadyCaughtUp =
    !!currentMarker &&
    (!deal.last_message_at || currentMarker >= deal.last_message_at);
  if (alreadyCaughtUp && !shouldBump) return false;

  const patch: Record<string, unknown> = {
    [isBrand ? "brand_read_at" : "artist_read_at"]: new Date().toISOString(),
  };
  if (shouldBump) patch.status = "viewed";

  await supabase.from("deals").update(patch).eq("id", deal.id);
  return true;
}
