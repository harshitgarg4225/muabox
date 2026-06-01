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
import { engagementRate } from "@/lib/instagram";
import {
  formatMoney,
  type ArtistPublicStats,
  type ArtistPublicMedia,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function compact(n: number | null) {
  if (n == null) return "—";
  return Intl.NumberFormat("en-US", { notation: "compact" }).format(n);
}

export default async function ArtistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await getUserAndProfile();
  if (!profile) redirect("/login");
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

  const er = engagementRate(media, artist.followers_count);

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
          <SendDealDialog
            artistId={artist.artist_id}
            artistName={artist.display_name ?? artist.username ?? "this artist"}
          />
        </CardHeader>
        <CardContent className="space-y-4">
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
