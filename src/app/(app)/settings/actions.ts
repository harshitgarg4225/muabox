"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  routeConfigured,
  createLinkedAccount,
  requestRouteProduct,
  configureSettlements,
} from "@/lib/razorpay-route";
import { reconcilePendingTransfers } from "@/lib/payouts";
import type { PricingModel } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function updateArtistProfile(formData: FormData) {
  const { supabase, user } = await requireUser();

  const pricing = (formData.get("pricing") as PricingModel) ?? "custom";
  const toCents = (v: FormDataEntryValue | null) => {
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
  };

  const update = {
    display_name: (formData.get("display_name") as string)?.trim() || null,
    bio: (formData.get("bio") as string)?.trim() || null,
    location: (formData.get("location") as string)?.trim() || null,
    pricing,
    price_min: pricing === "fixed" ? toCents(formData.get("price_min")) : null,
    price_max: pricing === "fixed" ? toCents(formData.get("price_max")) : null,
    currency: ((formData.get("currency") as string) || "USD").toUpperCase(),
  };

  const { error } = await supabase.from("artists").update(update).eq("id", user.id);
  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/dashboard");
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
  const legalName = get("legal_name");
  const email = get("email");
  const phone = get("phone");
  const businessType = get("business_type") || "individual";
  const pan = get("pan") || undefined;
  const accountNumber = get("account_number");
  const ifsc = get("ifsc").toUpperCase();
  const beneficiaryName = get("beneficiary_name");
  const city = get("city");
  const state = get("state");
  const postalCode = get("postal_code");

  if (!legalName || !email || !phone || !accountNumber || !ifsc || !beneficiaryName) {
    return { ok: false as const, reason: "missing_fields" };
  }

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
        pan,
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

export async function updateBrandProfile(formData: FormData) {
  const { supabase, user } = await requireUser();

  const update = {
    company_name: (formData.get("company_name") as string)?.trim() || null,
    website: (formData.get("website") as string)?.trim() || null,
    description: (formData.get("description") as string)?.trim() || null,
    logo_url: (formData.get("logo_url") as string)?.trim() || null,
  };

  const { error } = await supabase.from("brands").update(update).eq("id", user.id);
  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
