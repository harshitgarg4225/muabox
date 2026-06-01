"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

  // RLS enforces brand_id = auth.uid() on insert.
  const { error } = await supabase.from("deals").insert({
    brand_id: user.id,
    artist_id: artistId,
    message,
    product_description: productDescription,
    offer_amount: offerAmount,
    currency,
    status: "sent",
  });
  if (error) return { ok: false as const, reason: error.message };

  revalidatePath("/deals");
  return { ok: true as const };
}

export async function respondToDeal(dealId: string, status: DealStatus) {
  const { supabase } = await requireUser();
  if (status !== "accepted" && status !== "declined") {
    throw new Error("Invalid status");
  }
  // RLS: only the artist (participant) can update.
  const { error } = await supabase
    .from("deals")
    .update({ status })
    .eq("id", dealId);
  if (error) throw error;
  revalidatePath("/deals");
}

export async function markViewed(dealId: string) {
  const { supabase } = await requireUser();
  // Only bump 'sent' -> 'viewed'; leave terminal states alone.
  const { error } = await supabase
    .from("deals")
    .update({ status: "viewed" })
    .eq("id", dealId)
    .eq("status", "sent");
  if (error) throw error;
  revalidatePath("/deals");
}
