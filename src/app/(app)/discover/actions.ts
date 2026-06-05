"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/action-auth";

/** Toggle an artist on/off the brand's shortlist. Returns the new saved state. */
export async function toggleSaved(artistId: string) {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("saved_artists")
    .select("artist_id")
    .eq("brand_id", user.id)
    .eq("artist_id", artistId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("saved_artists")
      .delete()
      .eq("brand_id", user.id)
      .eq("artist_id", artistId);
    revalidatePath("/discover");
    return { saved: false as const };
  }

  // RLS enforces brand_id = auth.uid().
  await supabase
    .from("saved_artists")
    .insert({ brand_id: user.id, artist_id: artistId });
  revalidatePath("/discover");
  return { saved: true as const };
}
