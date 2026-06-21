"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/action-auth";
import type { UserRole } from "@/lib/types";

const schema = z.object({
  dealId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export async function submitReview(
  dealId: string,
  rating: number,
  comment: string
) {
  const { supabase, user } = await requireUser();
  const parsed = schema.safeParse({
    dealId,
    rating,
    comment: comment.trim() || undefined,
  });
  if (!parsed.success) return { ok: false as const, reason: "invalid" };

  const { data: deal } = await supabase
    .from("deals")
    .select("brand_id, artist_id, status")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return { ok: false as const, reason: "not_found" };
  // Only after the collaboration is marked complete — prevents premature
  // (or retaliatory) ratings right after an offer is accepted.
  if (deal.status !== "completed") {
    return { ok: false as const, reason: "not_yet" };
  }

  const isBrand = deal.brand_id === user.id;
  const isArtist = deal.artist_id === user.id;
  if (!isBrand && !isArtist) return { ok: false as const, reason: "forbidden" };

  const revieweeId = isBrand ? deal.artist_id : deal.brand_id;
  const reviewerRole: UserRole = isBrand ? "brand" : "artist";

  // RLS double-checks participation + deal status.
  const { error } = await supabase.from("reviews").insert({
    deal_id: dealId,
    reviewer_id: user.id,
    reviewee_id: revieweeId,
    reviewer_role: reviewerRole,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? null,
  });
  if (error) {
    // Unique (deal_id, reviewer_id) → already reviewed.
    if (error.code === "23505") return { ok: false as const, reason: "exists" };
    return { ok: false as const, reason: "failed" };
  }

  revalidatePath(`/deals/${dealId}`);
  return { ok: true as const };
}
