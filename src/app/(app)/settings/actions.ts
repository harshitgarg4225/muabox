"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/action-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  routeConfigured,
  createLinkedAccount,
  requestRouteProduct,
  configureSettlements,
} from "@/lib/razorpay-route";
import { reconcilePendingTransfers } from "@/lib/payouts";
import { parseSpecialties } from "@/lib/specialties";
import { parseRateCard, parseCollabTypes } from "@/lib/pricing";
import { z } from "zod";
import type { PricingModel } from "@/lib/types";

const artistProfileSchema = z.object({
  display_name: z.string().trim().max(80).nullable(),
  bio: z.string().trim().max(500).nullable(),
  location: z.string().trim().max(120).nullable(),
  pricing: z.enum(["fixed", "custom"]),
  currency: z.string().trim().length(3),
});

const brandProfileSchema = z.object({
  company_name: z.string().trim().max(120).nullable(),
  website: z.string().trim().url().max(200).or(z.literal("")).nullable(),
  description: z.string().trim().max(600).nullable(),
  logo_url: z.string().trim().max(500).nullable(),
});

const payoutSchema = z.object({
  legal_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8).max(15),
  business_type: z.string().trim().min(1),
  pan: z
    .string()
    .trim()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i)
    .optional()
    .or(z.literal("")),
  account_number: z.string().trim().min(5).max(30),
  ifsc: z.string().trim().regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/),
  beneficiary_name: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(60),
  state: z.string().trim().min(1).max(60),
  postal_code: z.string().trim().min(4).max(10),
});

export async function updateArtistProfile(formData: FormData) {
  const { supabase, user } = await requireUser();

  const fields = artistProfileSchema.parse({
    display_name: (formData.get("display_name") as string)?.trim() || null,
    bio: (formData.get("bio") as string)?.trim() || null,
    location: (formData.get("location") as string)?.trim() || null,
    pricing: (formData.get("pricing") as PricingModel) ?? "custom",
    currency: ((formData.get("currency") as string) || "INR").toUpperCase(),
  });

  const toCents = (v: FormDataEntryValue | null) => {
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
  };

  const minBudget = toCents(formData.get("min_budget"));
  const update = {
    ...fields,
    price_min:
      fields.pricing === "fixed" ? toCents(formData.get("price_min")) : null,
    price_max:
      fields.pricing === "fixed" ? toCents(formData.get("price_max")) : null,
    specialties: parseSpecialties(formData.get("specialties") as string),
    rate_card: parseRateCard(formData.get("rate_card") as string),
    collab_types: parseCollabTypes(formData.get("collab_types") as string),
    min_budget: minBudget,
  };

  const { error } = await supabase.from("artists").update(update).eq("id", user.id);
  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function setWhatsapp(value: string) {
  const { supabase, user } = await requireUser();
  const clean = value.trim();
  // Basic E.164-ish guard; empty clears it.
  if (clean && !/^\+?[1-9]\d{7,14}$/.test(clean.replace(/[\s-]/g, ""))) {
    return { ok: false as const, reason: "invalid" };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ whatsapp: clean || null })
    .eq("id", user.id);
  if (error) throw error;
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function setEmailNotifications(value: boolean) {
  const { supabase, user } = await requireUser();
  // Only the email_notifications column is client-updatable on profiles.
  const { error } = await supabase
    .from("profiles")
    .update({ email_notifications: value })
    .eq("id", user.id);
  if (error) throw error;
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function setOpenToPitches(value: boolean) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("brands")
    .update({ open_to_pitches: value })
    .eq("id", user.id);
  if (error) throw error;
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function setAccepting(value: boolean) {
  const { supabase, user } = await requireUser();

  // Guard: can't accept deals without a connected Instagram account.
  if (value) {
    const { data: ig } = await supabase
      .from("instagram_accounts")
      .select("id")
      .eq("artist_id", user.id)
      .maybeSingle();
    if (!ig) {
      return { ok: false as const, reason: "no_instagram" };
    }
  }

  const { error } = await supabase
    .from("artists")
    .update({ accepting_deals: value })
    .eq("id", user.id);
  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function savePayoutAccount(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!routeConfigured()) return { ok: false as const, reason: "unavailable" };

  const get = (k: string) => (formData.get(k) as string)?.trim() ?? "";
  const parsed = payoutSchema.safeParse({
    legal_name: get("legal_name"),
    email: get("email"),
    phone: get("phone"),
    business_type: get("business_type") || "individual",
    pan: get("pan").toUpperCase() || undefined,
    account_number: get("account_number"),
    ifsc: get("ifsc").toUpperCase(),
    beneficiary_name: get("beneficiary_name"),
    city: get("city"),
    state: get("state"),
    postal_code: get("postal_code"),
  });
  if (!parsed.success) return { ok: false as const, reason: "missing_fields" };

  const {
    legal_name: legalName,
    email,
    phone,
    business_type: businessType,
    pan,
    account_number: accountNumber,
    ifsc,
    beneficiary_name: beneficiaryName,
    city,
    state,
    postal_code: postalCode,
  } = parsed.data;

  const { data: existing } = await supabase
    .from("artist_payout_accounts")
    .select("*")
    .eq("artist_id", user.id)
    .maybeSingle();

  try {
    let accountId = existing?.razorpay_account_id as string | undefined;
    if (!accountId) {
      const account = await createLinkedAccount({
        email,
        phone,
        legalName,
        businessType,
        contactName: beneficiaryName,
        city,
        state,
        postalCode,
        pan: pan || undefined,
      });
      accountId = account.id;
    }

    let productId = existing?.razorpay_product_id as string | undefined;
    if (!productId) {
      const product = await requestRouteProduct(accountId);
      productId = product.id;
    }

    await configureSettlements(accountId, productId, {
      accountNumber,
      ifsc,
      beneficiaryName,
    });

    await supabase.from("artist_payout_accounts").upsert(
      {
        artist_id: user.id,
        razorpay_account_id: accountId,
        razorpay_product_id: productId,
        status: "active",
        bank_last4: accountNumber.slice(-4),
        beneficiary_name: beneficiaryName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "artist_id" }
    );

    // Release any payments that were held while payouts weren't set up.
    await reconcilePendingTransfers(createAdminClient(), user.id);

    revalidatePath("/settings");
    return { ok: true as const };
  } catch (err) {
    await supabase.from("artist_payout_accounts").upsert(
      {
        artist_id: user.id,
        status: "failed",
        beneficiary_name: beneficiaryName,
        bank_last4: accountNumber.slice(-4),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "artist_id" }
    );
    return {
      ok: false as const,
      reason: err instanceof Error ? err.message : "failed",
    };
  }
}

/**
 * Permanently delete the signed-in user's account. Deleting the auth user
 * cascades to profiles → artists/brands → deals/messages/payments/etc.
 */
export async function deleteAccount() {
  const { supabase, user } = await requireUser();
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (err) {
    logger.error("account deletion failed", err, { userId: user.id });
    throw new Error("Could not delete account. Please contact support.");
  }
  await supabase.auth.signOut();
  redirect("/");
}

export async function updateBrandProfile(formData: FormData) {
  const { supabase, user } = await requireUser();

  const update = brandProfileSchema.parse({
    company_name: (formData.get("company_name") as string)?.trim() || null,
    website: (formData.get("website") as string)?.trim() || null,
    description: (formData.get("description") as string)?.trim() || null,
    logo_url: (formData.get("logo_url") as string)?.trim() || null,
  });

  const { error } = await supabase.from("brands").update(update).eq("id", user.id);
  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
