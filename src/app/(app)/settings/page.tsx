import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ArtistSettingsForm } from "@/components/artist-settings-form";
import { BrandSettingsForm } from "@/components/brand-settings-form";
import type { Artist, Brand } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect("/login");

  const supabase = await createClient();

  if (profile.role === "artist") {
    const { data: artist } = await supabase
      .from("artists")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<Artist>();
    if (!artist) redirect("/onboarding");

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Profile &amp; pricing</h1>
        <ArtistSettingsForm artist={artist} />
      </div>
    );
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Brand>();
  if (!brand) redirect("/onboarding");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Brand profile</h1>
      <BrandSettingsForm brand={brand} userId={user.id} />
    </div>
  );
}
