"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  notifyNewDeal,
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
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

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
  });
  if (!parsed.success) {
    const isMsg = parsed.error.issues.some((i) => i.path[0] === "message");
    return { ok: false as const, reason: isMsg ? "message_required" : "invalid" };
  }
  const { artistId, message, productDescription, currency, offerAmount } =
    parsed.data;

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

export async function respondToDeal(dealId: string, status: DealStatus) {
  const { supabase } = await requireUser();
  if (status !== "accepted" && status !== "declined") {
    throw new Error("Invalid status");
  }
  // RLS: only participants can update.
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
    .select("brand_id, artist_id, status")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return;

  const isBrand = deal.brand_id === user.id;
  const patch: Record<string, unknown> = {
    [isBrand ? "brand_read_at" : "artist_read_at"]: new Date().toISOString(),
  };
  // First time the artist opens a fresh offer, bump 'sent' -> 'viewed'.
  if (!isBrand && deal.status === "sent") patch.status = "viewed";

  await supabase.from("deals").update(patch).eq("id", dealId);
}
