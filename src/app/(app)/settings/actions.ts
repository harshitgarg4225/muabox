"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
