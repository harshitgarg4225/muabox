"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/action-auth";

type Fail = { ok: false; reason: string };
type Ok = { ok: true };
const ok: Ok = { ok: true };

const createSchema = z.object({
  campaignId: z.string().uuid(),
  artistId: z.string().uuid(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "letters, numbers, - and _ only"),
  description: z.string().trim().max(80).optional(),
});

/** Brand assigns a unique promo code to an artist on one of its campaigns. */
export async function createPromoCode(input: {
  campaignId: string;
  artistId: string;
  code: string;
  description?: string;
}): Promise<Ok | Fail> {
  const { supabase, user } = await requireUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { campaignId, artistId, code, description } = parsed.data;

  // The campaign must belong to this brand.
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("brand_id", user.id)
    .maybeSingle();
  if (!campaign) return { ok: false, reason: "not_allowed" };

  const { error } = await supabase.from("promo_codes").insert({
    campaign_id: campaignId,
    brand_id: user.id,
    artist_id: artistId,
    code: code.toUpperCase(),
    description: description || null,
  });
  if (error) {
    // Unique (campaign_id, code) violation.
    return { ok: false, reason: error.code === "23505" ? "duplicate" : "failed" };
  }
  revalidatePath(`/campaigns/${campaignId}`);
  return ok;
}

const statsSchema = z.object({
  promoId: z.string().uuid(),
  redemptions: z.number().int().min(0).max(10_000_000),
  revenue: z.number().min(0).max(10_00_00_000), // rupees
});

/** Brand updates a code's attributed redemptions + sales (manual entry). */
export async function updatePromoStats(input: {
  promoId: string;
  redemptions: number;
  revenue: number; // rupees from the form
}): Promise<Ok | Fail> {
  const { supabase, user } = await requireUser();
  const parsed = statsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const { data: promo } = await supabase
    .from("promo_codes")
    .select("id, campaign_id, brand_id")
    .eq("id", parsed.data.promoId)
    .maybeSingle();
  if (!promo || (promo as { brand_id: string }).brand_id !== user.id) {
    return { ok: false, reason: "not_allowed" };
  }

  const { error } = await supabase
    .from("promo_codes")
    .update({
      redemptions: parsed.data.redemptions,
      revenue: Math.round(parsed.data.revenue * 100),
    })
    .eq("id", parsed.data.promoId);
  if (error) return { ok: false, reason: "failed" };
  revalidatePath(`/campaigns/${(promo as { campaign_id: string }).campaign_id}`);
  return ok;
}

/** Brand deletes a promo code. */
export async function deletePromoCode(promoId: string): Promise<Ok | Fail> {
  const { supabase, user } = await requireUser();
  const { data: promo } = await supabase
    .from("promo_codes")
    .select("id, campaign_id, brand_id")
    .eq("id", promoId)
    .maybeSingle();
  if (!promo || (promo as { brand_id: string }).brand_id !== user.id) {
    return { ok: false, reason: "not_allowed" };
  }
  const { error } = await supabase.from("promo_codes").delete().eq("id", promoId);
  if (error) return { ok: false, reason: "failed" };
  revalidatePath(`/campaigns/${(promo as { campaign_id: string }).campaign_id}`);
  return ok;
}
