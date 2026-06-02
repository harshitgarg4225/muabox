"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function adminOrThrow() {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) throw new Error("forbidden");
  return createAdminClient();
}

export async function setSuspended(userId: string, value: boolean) {
  const admin = await adminOrThrow();
  await admin.from("profiles").update({ suspended: value }).eq("id", userId);
  // Suspended artists must vanish from Discover and stop receiving deals.
  if (value) {
    await admin.from("artists").update({ accepting_deals: false }).eq("id", userId);
  }
  revalidatePath("/admin/users");
}

export async function setAdmin(userId: string, value: boolean) {
  const admin = await adminOrThrow();
  await admin.from("profiles").update({ is_admin: value }).eq("id", userId);
  revalidatePath("/admin/users");
}
