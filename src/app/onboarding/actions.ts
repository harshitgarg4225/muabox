"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyWelcome } from "@/lib/notify";
import type { UserRole } from "@/lib/types";

export async function selectRole(formData: FormData) {
  const role = formData.get("role") as UserRole;
  const fullName = (formData.get("full_name") as string)?.trim() || null;

  if (role !== "artist" && role !== "brand") {
    throw new Error("Invalid role");
  }
  // A name is required so artists are findable and brands aren't hidden by the
  // "company_name present" filter on the directory.
  if (!fullName || fullName.length < 2) {
    throw new Error("Please enter your name to continue.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Idempotent: if a profile already exists, just go to the dashboard.
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: user.id,
      role,
      full_name: fullName,
      email: user.email,
    });
    if (profileErr) throw profileErr;

    if (role === "artist") {
      const { error } = await supabase
        .from("artists")
        .insert({ id: user.id, display_name: fullName });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("brands")
        .insert({ id: user.id, company_name: fullName });
      if (error) throw error;
    }

    after(() => notifyWelcome(user.id, role));
  }

  redirect("/dashboard");
}
