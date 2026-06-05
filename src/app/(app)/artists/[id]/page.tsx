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
  if (profile.role !== "brand") redirect("/dashboard");

  const { id } = await params;
  const supabase = await createClient();

  const { data: artist } = await supabase
    .from("artist_public_stats")
    .select("*")
    .eq("artist_id", id)
    .maybeSingle<ArtistPublicStats>();

  if (!artist) notFound();

  const { data: mediaData } = await supabase
    .from("artist_public_media")
    .select("*")
    .eq("artist_id", id)
    .order("posted_at", { ascending: false });
  const media = (mediaData as ArtistPublicMedia[]) ?? [];

  // Has this brand already sent a deal to this artist?
  const { data: existingDeal } = await supabase
    .from("deals")
    .select("*")
    .eq("brand_id", user.id)
    .eq("artist_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Deal>();

  const { data: savedRow } = await supabase
    .from("saved_artists")
    .select("artist_id")
    .eq("brand_id", user.id)
    .eq("artist_id", id)
    .maybeSingle();

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
        <Link href="/discover">
          <ArrowLeft /> Back to discover
        </Link>
      </Button>

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
            <SaveArtistButton
              artistId={artist.artist_id}
              initialSaved={!!savedRow}
              withLabel
            />
            <SendDealDialog
              artistId={artist.artist_id}
              artistName={artist.display_name ?? artist.username ?? "this artist"}
              defaultCurrency={artist.currency ?? "USD"}
              pricingHint={pricingHint}
              alreadySent={!!existingDeal}
            />
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
