"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/action-auth";
import { rateLimit } from "@/lib/rate-limit";
import { parseSpecialties } from "@/lib/specialties";
import { notifyNewDeal } from "@/lib/notify";
import type { Campaign, Deal } from "@/lib/types";

const campaignSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  product: z.string().trim().max(200).optional(),
  budget: z.number().int().min(0).max(10_00_00_000_00).nullable(), // ≤ ₹10 crore
});

export async function createCampaign(formData: FormData) {
  const { supabase, user } = await requireUser();

  const budgetRaw = formData.get("budget");
  const budgetNum = budgetRaw ? Number(budgetRaw) : NaN;
  const parsed = campaignSchema.safeParse({
    name: ((formData.get("name") as string) ?? "").trim(),
    description: (formData.get("description") as string)?.trim() || undefined,
    product: (formData.get("product") as string)?.trim() || undefined,
    budget:
      Number.isFinite(budgetNum) && budgetNum > 0
        ? Math.round(budgetNum * 100)
        : null,
  });
  if (!parsed.success) return { ok: false as const, reason: "invalid" };

  const targetSpecialties = parseSpecialties(
    formData.get("target_specialties") as string
  );

  const { data: created, error } = await supabase
    .from("campaigns")
    .insert({
      brand_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      product: parsed.data.product ?? null,
      budget: parsed.data.budget,
      target_specialties: targetSpecialties,
      status: "active",
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false as const, reason: "failed" };

  revalidatePath("/campaigns");
  redirect(`/campaigns/${created.id}`);
}

export async function setCampaignStatus(
  campaignId: string,
  status: "active" | "closed"
) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("campaigns")
    .update({ status })
    .eq("id", campaignId)
    .eq("brand_id", user.id);
  if (error) throw error;
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
}

const bulkSchema = z.object({
  campaignId: z.string().uuid(),
  artistIds: z.array(z.string().uuid()).min(1).max(25),
  message: z.string().trim().min(1).max(1000),
  offerAmount: z.number().int().min(0).max(1_000_000_00).nullable(),
});

/**
 * Outreach at scale: invite up to 25 artists to a campaign in one shot.
 * Enforces the campaign budget: existing non-declined commitments plus this
 * batch must fit inside it.
 */
export async function bulkInvite(input: {
  campaignId: string;
  artistIds: string[];
  message: string;
  offerAmount: number | null; // rupees from the form
}) {
  const { supabase, user } = await requireUser();

  const limit = rateLimit(`bulk-invite:${user.id}`, 5, 60_000 * 60);
  if (!limit.ok) return { ok: false as const, reason: "rate_limited" };

  const parsed = bulkSchema.safeParse({
    campaignId: input.campaignId,
    artistIds: input.artistIds,
    message: input.message.trim(),
    offerAmount:
      input.offerAmount != null && input.offerAmount > 0
        ? Math.round(input.offerAmount * 100)
        : null,
  });
  if (!parsed.success) return { ok: false as const, reason: "invalid" };
  const { campaignId, artistIds, message, offerAmount } = parsed.data;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("brand_id", user.id)
    .maybeSingle<Campaign>();
  if (!campaign || campaign.status !== "active") {
    return { ok: false as const, reason: "invalid_campaign" };
  }

  // Budget guard: committed = all non-declined offers on this campaign.
  if (campaign.budget != null && offerAmount != null) {
    const { data: existing } = await supabase
      .from("deals")
      .select("offer_amount, status")
      .eq("campaign_id", campaignId)
      .neq("status", "declined");
    const committed = ((existing as Pick<Deal, "offer_amount" | "status">[]) ?? [])
      .reduce((s, d) => s + (d.offer_amount ?? 0), 0);
    const batchTotal = offerAmount * artistIds.length;
    if (committed + batchTotal > campaign.budget) {
      return {
        ok: false as const,
        reason: "over_budget",
        remaining: Math.max(0, campaign.budget - committed),
      };
    }
  }

  // Skip artists already invited to this campaign.
  const { data: already } = await supabase
    .from("deals")
    .select("artist_id")
    .eq("campaign_id", campaignId)
    .in("artist_id", artistIds);
  const alreadySet = new Set(
    ((already as { artist_id: string }[]) ?? []).map((d) => d.artist_id)
  );
  const targets = artistIds.filter((id) => !alreadySet.has(id));
  if (targets.length === 0) {
    return { ok: false as const, reason: "all_invited" };
  }

  const now = new Date().toISOString();
  const rows = targets.map((artistId) => ({
    brand_id: user.id,
    artist_id: artistId,
    message,
    product_description: campaign.product,
    offer_amount: offerAmount,
    currency: "INR",
    status: "sent",
    initiated_by: "brand",
    campaign_id: campaignId,
    last_message_at: now,
    last_message_sender_id: user.id,
    brand_read_at: now,
  }));

  const { data: created, error } = await supabase
    .from("deals")
    .insert(rows)
    .select("id");
  if (error) return { ok: false as const, reason: error.message };

  after(async () => {
    for (const d of created ?? []) await notifyNewDeal(d.id);
  });

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/deals");
  return { ok: true as const, invited: targets.length };
}
