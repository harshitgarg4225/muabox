import type { SupabaseClient } from "@supabase/supabase-js";

/** The deal fields needed to compute and apply a read marker. */
export type ReadMarkerDeal = {
  id: string;
  brand_id: string;
  artist_id: string;
  status: string;
  initiated_by: string;
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

  // Skip the write if the read marker is already fresh and no status bump is
  // due. We treat any marker within the last minute as fresh enough.
  const currentMarker = isBrand ? deal.brand_read_at : deal.artist_read_at;
  const markerFresh =
    !!currentMarker && Date.now() - new Date(currentMarker).getTime() < 60_000;
  if (markerFresh && !shouldBump) return false;

  const patch: Record<string, unknown> = {
    [isBrand ? "brand_read_at" : "artist_read_at"]: new Date().toISOString(),
  };
  if (shouldBump) patch.status = "viewed";

  await supabase.from("deals").update(patch).eq("id", deal.id);
  return true;
}
