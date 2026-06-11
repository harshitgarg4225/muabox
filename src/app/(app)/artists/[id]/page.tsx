import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaGallery } from "@/components/profile-stats";
import { RateCardDisplay } from "@/components/rate-card-display";
import { SendDealDialog } from "@/components/send-deal-dialog";
import { SaveArtistButton } from "@/components/save-artist-button";
import { engagementRate } from "@/lib/instagram";
import { compact } from "@/lib/format";
import {
  formatMoney,
  type ArtistPublicStats,
  type ArtistPublicMedia,
  type Deal,
} from "@/lib/types";

const DEAL_STATUS_LABEL: Record<string, string> = {
  sent: "sent — awaiting their reply",
  viewed: "viewed by the artist",
  accepted: "accepted 🎉",
  declined: "declined",
  completed: "completed",
};

export const dynamic = "force-dynamic";

export default async function ArtistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect("/login");

  const { id } = await params;
  // Artists may preview their OWN public profile; everything else is brand-only.
  const isSelf = profile.role === "artist" && user.id === id;
  if (profile.role !== "brand" && !isSelf) redirect("/dashboard");

  const supabase = await createClient();

  const { data: artist } = await supabase
    .from("artist_public_stats")
    .select("*")
    .eq("artist_id", id)
    .maybeSingle<ArtistPublicStats>();

  if (!artist && isSelf) {
    // Their public profile only exists while they're accepting deals.
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <span className="text-4xl">🪞</span>
        <h1 className="text-xl font-bold text-navy">
          Your public profile isn&apos;t live yet
        </h1>
        <p className="text-sm text-muted-foreground">
          Brands can only see you while <strong>accepting deals</strong> is on
          and your Instagram is connected. Flip it on and come back to preview
          exactly what they&apos;ll see.
        </p>
        <Button asChild variant="accent">
          <Link href="/dashboard#accepting">Go live</Link>
        </Button>
      </div>
    );
  }
  if (!artist) notFound();

  const { data: mediaData } = await supabase
    .from("artist_public_media")
    .select("*")
    .eq("artist_id", id)
    .order("posted_at", { ascending: false });
  const media = (mediaData as ArtistPublicMedia[]) ?? [];

  // Brand-only context (skip entirely when an artist previews themselves).
  let existingDeal: Deal | null = null;
  let savedRow: { artist_id: string } | null = null;
  let campaigns: { id: string; name: string }[] = [];
  if (!isSelf) {
    const { data: ed } = await supabase
      .from("deals")
      .select("*")
      .eq("brand_id", user.id)
      .eq("artist_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Deal>();
    existingDeal = ed ?? null;

    const { data: sr } = await supabase
      .from("saved_artists")
      .select("artist_id")
      .eq("brand_id", user.id)
      .eq("artist_id", id)
      .maybeSingle();
    savedRow = sr ?? null;

    const { data: campaignRows } = await supabase
      .from("campaigns")
      .select("id, name")
      .eq("brand_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    campaigns = (campaignRows as { id: string; name: string }[]) ?? [];
  }

  const er = engagementRate(media, artist.followers_count);

  const pricingHint =
    artist.pricing === "fixed" && artist.price_min != null
      ? `Listed rate: ${formatMoney(artist.price_min, artist.currency)}${
          artist.price_max != null
            ? `–${formatMoney(artist.price_max, artist.currency)}`
            : "+"
        }`
      : "This artist asks brands to contact them for pricing.";

  const stats = [
    { label: "Followers", value: compact(artist.followers_count) },
    { label: "Posts", value: compact(artist.media_count) },
    { label: "Engagement", value: `${er}%` },
  ];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={isSelf ? "/dashboard" : "/discover"}>
          <ArrowLeft /> {isSelf ? "Back to dashboard" : "Back to discover"}
        </Link>
      </Button>

      {isSelf && (
        <div className="rounded-xl border border-navy/15 bg-navy/5 px-4 py-2.5 text-sm text-navy">
          👀 This is exactly what brands see when they open your profile.{" "}
          <Link href="/settings" className="font-medium underline">
            Polish it in Settings
          </Link>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {artist.profile_picture_url ? (
              <Image
                src={artist.profile_picture_url}
                alt={artist.username ?? ""}
                width={64}
                height={64}
                unoptimized
                className="size-16 rounded-full object-cover"
              />
            ) : (
              <div className="size-16 rounded-full bg-muted" />
            )}
            <div>
              <CardTitle className="text-xl">
                {artist.display_name ?? artist.username}
              </CardTitle>
              <p className="text-sm text-muted-foreground">@{artist.username}</p>
              {artist.location && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" /> {artist.location}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isSelf && (
            <SaveArtistButton
              artistId={artist.artist_id}
              initialSaved={!!savedRow}
              withLabel
            />
            )}
            {!isSelf && (
            <SendDealDialog
              artistId={artist.artist_id}
              artistName={artist.display_name ?? artist.username ?? "this artist"}
              defaultCurrency={artist.currency ?? "INR"}
              pricingHint={pricingHint}
              alreadySent={!!existingDeal}
              campaigns={campaigns}
            />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {existingDeal && (
            <div className="rounded-xl border border-navy/15 bg-navy/5 px-4 py-2.5 text-sm text-navy">
              You&apos;ve already sent this artist a deal —{" "}
              <span className="font-medium">
                {DEAL_STATUS_LABEL[existingDeal.status] ?? existingDeal.status}
              </span>
              .{" "}
              <Link href="/deals" className="underline">
                View in Deals
              </Link>
            </div>
          )}
          {artist.bio && <p className="text-sm">{artist.bio}</p>}
          {artist.specialties?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {artist.specialties.map((sp) => (
                <Badge key={sp} variant="secondary">
                  {sp}
                </Badge>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border p-3 text-center"
              >
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          <div>
            {artist.pricing === "fixed" && artist.price_min != null ? (
              <Badge variant="secondary">
                {formatMoney(artist.price_min, artist.currency)}
                {artist.price_max != null
                  ? ` – ${formatMoney(artist.price_max, artist.currency)}`
                  : "+"}
              </Badge>
            ) : (
              <Badge variant="outline">Contact for pricing</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {((artist.collab_types?.length ?? 0) > 0 ||
        (artist.rate_card?.length ?? 0) > 0 ||
        artist.min_budget != null) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-navy">
              Rates &amp; collaborations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RateCardDisplay
              collabTypes={artist.collab_types ?? []}
              rateCard={artist.rate_card ?? []}
              minBudget={artist.min_budget}
              currency={artist.currency}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent media</CardTitle>
        </CardHeader>
        <CardContent>
          <MediaGallery media={media} />
        </CardContent>
      </Card>
    </div>
  );
}
