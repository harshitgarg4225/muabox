"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  notifyNewDeal,
  notifyDealResponse,
  notifyDealCompleted,
  notifyNewMessage,
} from "@/lib/notify";
import type { DealStatus } from "@/lib/types";

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

  const artistId = String(formData.get("artist_id") ?? "");
  const message = (formData.get("message") as string)?.trim() || null;
  const productDescription =
    (formData.get("product_description") as string)?.trim() || null;
  const currency = ((formData.get("currency") as string) || "USD").toUpperCase();

  const amountRaw = formData.get("offer_amount");
  const amountNum = amountRaw ? Number(amountRaw) : NaN;
  const offerAmount =
    Number.isFinite(amountNum) && amountNum > 0
      ? Math.round(amountNum * 100)
      : null;

  if (!artistId) throw new Error("Missing artist");
  if (!message) return { ok: false as const, reason: "message_required" };

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
  const text = body.trim();
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
