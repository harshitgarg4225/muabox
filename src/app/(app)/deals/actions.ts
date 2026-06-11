"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/action-auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  notifyNewDeal,
  notifyNewPitch,
  notifyReminder,
  notifyDealResponse,
  notifyDealCompleted,
  notifyNewMessage,
} from "@/lib/notify";
import type { DealStatus } from "@/lib/types";

const dealSchema = z.object({
  artistId: z.string().uuid(),
  message: z.string().trim().min(1).max(1000),
  productDescription: z.string().trim().max(500).optional(),
  currency: z.string().trim().length(3),
  offerAmount: z.number().int().min(0).max(1_000_000_00).nullable(),
  campaignId: z.string().uuid().optional(),
});

const REMINDER_COOLDOWN_MS = 48 * 60 * 60 * 1000;

export async function sendDeal(formData: FormData) {
  const { supabase, user } = await requireUser();

  const limit = rateLimit(`send-deal:${user.id}`, 20, 60_000);
  if (!limit.ok) return { ok: false as const, reason: "rate_limited" };

  const amountRaw = formData.get("offer_amount");
  const amountNum = amountRaw ? Number(amountRaw) : NaN;
  const parsed = dealSchema.safeParse({
    artistId: String(formData.get("artist_id") ?? ""),
    message: ((formData.get("message") as string) ?? "").trim(),
    productDescription:
      (formData.get("product_description") as string)?.trim() || undefined,
    currency: ((formData.get("currency") as string) || "INR").toUpperCase(),
    offerAmount:
      Number.isFinite(amountNum) && amountNum > 0
        ? Math.round(amountNum * 100)
        : null,
    campaignId: (formData.get("campaign_id") as string)?.trim() || undefined,
  });
  if (!parsed.success) {
    const isMsg = parsed.error.issues.some((i) => i.path[0] === "message");
    return { ok: false as const, reason: isMsg ? "message_required" : "invalid" };
  }
  const {
    artistId,
    message,
    productDescription,
    currency,
    offerAmount,
    campaignId,
  } = parsed.data;

  // A linked campaign must be the brand's own, active campaign.
  if (campaignId) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, status")
      .eq("id", campaignId)
      .eq("brand_id", user.id)
      .maybeSingle();
    if (!campaign || campaign.status !== "active") {
      return { ok: false as const, reason: "invalid_campaign" };
    }
  }

  const now = new Date().toISOString();
  // RLS enforces brand_id = auth.uid() on insert. The offer is the first
  // message in the thread (from the brand), so the artist sees it as unread.
  const { data: created, error } = await supabase
    .from("deals")
    .insert({
      brand_id: user.id,
      artist_id: artistId,
      message,
      product_description: productDescription,
      offer_amount: offerAmount,
      currency,
      status: "sent",
      initiated_by: "brand",
      campaign_id: campaignId ?? null,
      last_message_at: now,
      last_message_sender_id: user.id,
      brand_read_at: now,
    })
    .select("id")
    .single();
  if (error || !created) {
    return { ok: false as const, reason: error?.message ?? "insert_failed" };
  }

  after(() => notifyNewDeal(created.id));
  revalidatePath("/deals");
  return { ok: true as const };
}

const pitchSchema = z.object({
  brandId: z.string().uuid(),
  message: z.string().trim().min(1).max(1000),
  proposedAmount: z.number().int().min(0).max(1_000_000_00).nullable(),
});

/** Artist → brand pitch (a deal the artist initiates). */
export async function sendPitch(formData: FormData) {
  const { supabase, user } = await requireUser();

  const limit = rateLimit(`pitch:${user.id}`, 10, 60_000);
  if (!limit.ok) return { ok: false as const, reason: "rate_limited" };

  const amountRaw = formData.get("proposed_amount");
  const amountNum = amountRaw ? Number(amountRaw) : NaN;
  const parsed = pitchSchema.safeParse({
    brandId: String(formData.get("brand_id") ?? ""),
    message: ((formData.get("message") as string) ?? "").trim(),
    proposedAmount:
      Number.isFinite(amountNum) && amountNum > 0
        ? Math.round(amountNum * 100)
        : null,
  });
  if (!parsed.success) {
    const isMsg = parsed.error.issues.some((i) => i.path[0] === "message");
    return { ok: false as const, reason: isMsg ? "message_required" : "invalid" };
  }
  const { brandId, message, proposedAmount } = parsed.data;

  // The brand must be open to pitches.
  const { data: brand } = await supabase
    .from("brand_public")
    .select("brand_id, open_to_pitches")
    .eq("brand_id", brandId)
    .maybeSingle();
  if (!brand?.open_to_pitches) {
    return { ok: false as const, reason: "not_open" };
  }

  // One open pitch per brand at a time.
  const { data: existing } = await supabase
    .from("deals")
    .select("id")
    .eq("artist_id", user.id)
    .eq("brand_id", brandId)
    .eq("initiated_by", "artist")
    .in("status", ["sent", "viewed"])
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: false as const, reason: "already_pitched" };

  const now = new Date().toISOString();
  // RLS: "artist creates pitch" requires artist_id = auth.uid() + initiated_by.
  const { data: created, error } = await supabase
    .from("deals")
    .insert({
      brand_id: brandId,
      artist_id: user.id,
      message,
      offer_amount: proposedAmount,
      currency: "INR",
      status: "sent",
      initiated_by: "artist",
      last_message_at: now,
      last_message_sender_id: user.id,
      artist_read_at: now,
    })
    .select("id")
    .single();
  if (error || !created) {
    return { ok: false as const, reason: error?.message ?? "insert_failed" };
  }

  after(() => notifyNewPitch(created.id));
  revalidatePath("/deals");
  revalidatePath("/brands");
  return { ok: true as const };
}

export async function respondToDeal(dealId: string, status: DealStatus) {
  const { supabase, user } = await requireUser();
  if (status !== "accepted" && status !== "declined") {
    throw new Error("Invalid status");
  }

  // Only the RECEIVER may accept/decline: the artist for brand offers, the
  // brand for artist pitches. (RLS alone would let either participant update.)
  const { data: deal } = await supabase
    .from("deals")
    .select("brand_id, artist_id, initiated_by, status")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) throw new Error("Not found");
  const receiverId =
    deal.initiated_by === "artist" ? deal.brand_id : deal.artist_id;
  if (user.id !== receiverId) throw new Error("Only the recipient can respond");
  if (deal.status !== "sent" && deal.status !== "viewed") {
    throw new Error("Deal already resolved");
  }

  const { error } = await supabase
    .from("deals")
    .update({ status })
    .eq("id", dealId);
  if (error) throw error;
  after(() => notifyDealResponse(dealId, status));
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
}

export async function completeDeal(dealId: string) {
  const { supabase, user } = await requireUser();
  // Either participant can mark an accepted deal complete.
  const { error } = await supabase
    .from("deals")
    .update({ status: "completed" })
    .eq("id", dealId)
    .eq("status", "accepted");
  if (error) throw error;
  after(() => notifyDealCompleted(dealId, user.id));
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
}

/** Brand nudges an artist who hasn't responded. 48h cooldown per deal. */
export async function remindDeal(dealId: string) {
  const { supabase, user } = await requireUser();

  const limit = rateLimit(`remind:${user.id}`, 20, 60_000 * 10);
  if (!limit.ok) return { ok: false as const, reason: "rate_limited" };

  const { data: deal } = await supabase
    .from("deals")
    .select("brand_id, initiated_by, status, reminded_at")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal || deal.brand_id !== user.id || deal.initiated_by !== "brand") {
    return { ok: false as const, reason: "not_allowed" };
  }
  if (deal.status !== "sent" && deal.status !== "viewed") {
    return { ok: false as const, reason: "already_resolved" };
  }
  if (
    deal.reminded_at &&
    Date.now() - new Date(deal.reminded_at).getTime() < REMINDER_COOLDOWN_MS
  ) {
    return { ok: false as const, reason: "cooldown" };
  }

  const { error } = await supabase
    .from("deals")
    .update({ reminded_at: new Date().toISOString() })
    .eq("id", dealId);
  if (error) return { ok: false as const, reason: "failed" };

  after(() => notifyReminder(dealId));
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  return { ok: true as const };
}

/** A brand retracts its own still-pending offer. */
export async function withdrawDeal(dealId: string) {
  const { supabase, user } = await requireUser();
  const { data: deal } = await supabase
    .from("deals")
    .select("brand_id, initiated_by, status")
    .eq("id", dealId)
    .maybeSingle();
  if (
    !deal ||
    deal.brand_id !== user.id ||
    deal.initiated_by !== "brand" ||
    (deal.status !== "sent" && deal.status !== "viewed")
  ) {
    throw new Error("Cannot withdraw");
  }
  const { error } = await supabase
    .from("deals")
    .update({ status: "declined" })
    .eq("id", dealId);
  if (error) throw error;
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
}

export async function sendMessage(dealId: string, body: string) {
  const { supabase, user } = await requireUser();
  const limit = rateLimit(`msg:${user.id}`, 30, 60_000);
  if (!limit.ok) return { ok: false as const };
  const text = body.trim().slice(0, 4000); // cap length server-side
  if (!text) return { ok: false as const };

  // RLS: sender must be a participant and post as themselves.
  const { error } = await supabase
    .from("deal_messages")
    .insert({ deal_id: dealId, sender_id: user.id, body: text });
  if (error) return { ok: false as const };

  // Mark the deal read for the sender (they just engaged with it).
  await markDealRead(dealId);
  after(() => notifyNewMessage(dealId, user.id));
  revalidatePath(`/deals/${dealId}`);
  return { ok: true as const };
}

/** Stamp the current user's read marker for a deal (powers unread badges). */
export async function markDealRead(dealId: string) {
  const { supabase, user } = await requireUser();

  const { data: deal } = await supabase
    .from("deals")
    .select("brand_id, artist_id, status, initiated_by")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return;

  const isBrand = deal.brand_id === user.id;
  const patch: Record<string, unknown> = {
    [isBrand ? "brand_read_at" : "artist_read_at"]: new Date().toISOString(),
  };
  // First time the RECEIVER opens a fresh offer/pitch, bump 'sent' -> 'viewed'.
  const isReceiver =
    deal.initiated_by === "artist" ? isBrand : !isBrand;
  if (isReceiver && deal.status === "sent") patch.status = "viewed";

  await supabase.from("deals").update(patch).eq("id", dealId);
}
