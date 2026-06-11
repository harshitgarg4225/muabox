import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ArtistSettingsForm } from "@/components/artist-settings-form";
import { BrandSettingsForm } from "@/components/brand-settings-form";
import { PayoutOnboardingForm } from "@/components/payout-onboarding-form";
import { NotificationSettings } from "@/components/notification-settings";
import { PitchToggle } from "@/components/pitch-toggle";
import { DeleteAccountSection } from "@/components/delete-account-section";
import { routeConfigured } from "@/lib/razorpay-route";
import { PLATFORM_FEE_PERCENT } from "@/lib/payouts";
import type { Artist, Brand, ArtistPayoutAccount } from "@/lib/types";

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

    const { data: payout } = await supabase
      .from("artist_payout_accounts")
      .select("*")
      .eq("artist_id", user.id)
      .maybeSingle<ArtistPayoutAccount>();

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-navy">Profile &amp; pricing</h1>
        <ArtistSettingsForm artist={artist} />
        <PayoutOnboardingForm
          account={payout ?? null}
          configured={routeConfigured()}
          feePercent={PLATFORM_FEE_PERCENT}
        />
        <NotificationSettings initial={profile.email_notifications} whatsapp={profile.whatsapp} />
        <DeleteAccountSection />
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
      <h1 className="text-2xl font-bold text-navy">Brand profile</h1>
      <BrandSettingsForm brand={brand} userId={user.id} />
      <PitchToggle initial={brand.open_to_pitches ?? true} />
      <NotificationSettings initial={profile.email_notifications} whatsapp={profile.whatsapp} />
      <DeleteAccountSection />
    </div>
  );
}
