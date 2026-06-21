"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/action-auth";
import { rateLimit } from "@/lib/rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";

type Fail = { ok: false; reason: string };
type Ok = { ok: true };
const ok: Ok = { ok: true };

/** Load a deal's participants so we can enforce who may do what. */
async function dealParties(supabase: SupabaseClient, dealId: string) {
  const { data } = await supabase
    .from("deals")
    .select("id, brand_id, artist_id")
    .eq("id", dealId)
    .maybeSingle();
  return data as { id: string; brand_id: string; artist_id: string } | null;
}

/** Resolve the parent deal of a deliverable row. */
async function deliverableDeal(supabase: SupabaseClient, deliverableId: string) {
  const { data: row } = await supabase
    .from("deal_deliverables")
    .select("id, deal_id, status")
    .eq("id", deliverableId)
    .maybeSingle();
  if (!row) return null;
  const deal = await dealParties(supabase, (row as { deal_id: string }).deal_id);
  return deal ? { row: row as { id: string; deal_id: string; status: string }, deal } : null;
}

// ---------------------------------------------------------------------------
// DELIVERABLES
// ---------------------------------------------------------------------------

/** Brand adds an expected deliverable line-item to a deal. */
export async function addDeliverable(
  dealId: string,
  label: string
): Promise<Ok | Fail> {
  const { supabase, user } = await requireUser();
  const clean = label.trim().slice(0, 120);
  if (!clean) return { ok: false, reason: "label_required" };

  const deal = await dealParties(supabase, dealId);
  if (!deal || deal.brand_id !== user.id) {
    return { ok: false, reason: "not_allowed" };
  }
  const { error } = await supabase
    .from("deal_deliverables")
    .insert({ deal_id: dealId, label: clean });
  if (error) return { ok: false, reason: "failed" };
  revalidatePath(`/deals/${dealId}`);
  return ok;
}

/** Brand removes a deliverable line-item. */
export async function removeDeliverable(
  deliverableId: string
): Promise<Ok | Fail> {
  const { supabase, user } = await requireUser();
  const found = await deliverableDeal(supabase, deliverableId);
  if (!found || found.deal.brand_id !== user.id) {
    return { ok: false, reason: "not_allowed" };
  }
  const { error } = await supabase
    .from("deal_deliverables")
    .delete()
    .eq("id", deliverableId);
  if (error) return { ok: false, reason: "failed" };
  revalidatePath(`/deals/${found.deal.id}`);
  return ok;
}

const urlSchema = z
  .string()
  .trim()
  .max(500)
  .url()
  // Only http(s) — block javascript:/data: and other schemes (anchor XSS).
  .refine((u) => /^https?:\/\//i.test(u), "must be an http(s) link");

/** Artist submits the live post link for a deliverable. */
export async function submitDeliverable(
  deliverableId: string,
  postUrl: string
): Promise<Ok | Fail> {
  const { supabase, user } = await requireUser();
  const parsed = urlSchema.safeParse(postUrl);
  if (!parsed.success) return { ok: false, reason: "invalid_url" };

  const found = await deliverableDeal(supabase, deliverableId);
  if (!found || found.deal.artist_id !== user.id) {
    return { ok: false, reason: "not_allowed" };
  }
  const { error } = await supabase
    .from("deal_deliverables")
    .update({
      post_url: parsed.data,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      review_note: null,
      reviewed_at: null,
    })
    .eq("id", deliverableId);
  if (error) return { ok: false, reason: "failed" };
  revalidatePath(`/deals/${found.deal.id}`);
  return ok;
}

/** Brand approves a submitted deliverable, or requests changes. */
export async function reviewDeliverable(
  deliverableId: string,
  approve: boolean,
  note?: string
): Promise<Ok | Fail> {
  const { supabase, user } = await requireUser();
  const found = await deliverableDeal(supabase, deliverableId);
  if (!found || found.deal.brand_id !== user.id) {
    return { ok: false, reason: "not_allowed" };
  }
  const { error } = await supabase
    .from("deal_deliverables")
    .update({
      status: approve ? "approved" : "changes_requested",
      review_note: note?.trim().slice(0, 300) || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", deliverableId);
  if (error) return { ok: false, reason: "failed" };
  revalidatePath(`/deals/${found.deal.id}`);
  return ok;
}

// ---------------------------------------------------------------------------
// DISCLOSURE (ASCI)
// ---------------------------------------------------------------------------

/** Artist confirms they'll disclose the paid partnership (#ad). */
export async function confirmDisclosure(dealId: string): Promise<Ok | Fail> {
  const { supabase, user } = await requireUser();
  const deal = await dealParties(supabase, dealId);
  if (!deal || deal.artist_id !== user.id) {
    return { ok: false, reason: "not_allowed" };
  }
  const { error } = await supabase
    .from("deals")
    .update({ disclosure_confirmed_at: new Date().toISOString() })
    .eq("id", dealId);
  if (error) return { ok: false, reason: "failed" };
  revalidatePath(`/deals/${dealId}`);
  return ok;
}

// ---------------------------------------------------------------------------
// PRODUCT SEEDING / SHIPPING
// ---------------------------------------------------------------------------

const addressSchema = z.object({
  recipient_name: z.string().trim().min(1).max(120),
  address_line: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  pincode: z.string().trim().min(4).max(12),
  phone: z.string().trim().min(7).max(20),
});

/** Artist provides a consented shipping address for a gifting deal. */
export async function saveShippingAddress(
  dealId: string,
  input: {
    recipient_name: string;
    address_line: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  }
): Promise<Ok | Fail> {
  const { supabase, user } = await requireUser();
  const limit = await rateLimit(`ship-addr:${user.id}`, 20, 60_000);
  if (!limit.ok) return { ok: false, reason: "rate_limited" };

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const deal = await dealParties(supabase, dealId);
  if (!deal || deal.artist_id !== user.id) {
    return { ok: false, reason: "not_allowed" };
  }
  const { error } = await supabase.from("deal_shipments").upsert(
    {
      deal_id: dealId,
      ...parsed.data,
      status: "address_provided",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "deal_id" }
  );
  if (error) return { ok: false, reason: "failed" };
  revalidatePath(`/deals/${dealId}`);
  return ok;
}

const trackingSchema = z.object({
  courier: z.string().trim().max(80).optional(),
  tracking_number: z.string().trim().max(80).optional(),
});

/** Brand marks the product shipped, with optional courier + tracking. */
export async function markShipped(
  dealId: string,
  input: { courier?: string; tracking_number?: string }
): Promise<Ok | Fail> {
  const { supabase, user } = await requireUser();
  const parsed = trackingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const deal = await dealParties(supabase, dealId);
  if (!deal || deal.brand_id !== user.id) {
    return { ok: false, reason: "not_allowed" };
  }
  const { error } = await supabase.from("deal_shipments").upsert(
    {
      deal_id: dealId,
      courier: parsed.data.courier || null,
      tracking_number: parsed.data.tracking_number || null,
      status: "shipped",
      shipped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "deal_id" }
  );
  if (error) return { ok: false, reason: "failed" };
  revalidatePath(`/deals/${dealId}`);
  return ok;
}

/** Either participant confirms the product arrived. */
export async function markDelivered(dealId: string): Promise<Ok | Fail> {
  const { supabase, user } = await requireUser();
  const deal = await dealParties(supabase, dealId);
  if (!deal || (deal.brand_id !== user.id && deal.artist_id !== user.id)) {
    return { ok: false, reason: "not_allowed" };
  }
  const { error } = await supabase
    .from("deal_shipments")
    .update({
      status: "delivered",
      delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("deal_id", dealId);
  if (error) return { ok: false, reason: "failed" };
  revalidatePath(`/deals/${dealId}`);
  return ok;
}
