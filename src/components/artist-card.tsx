import Link from "next/link";
import Image from "next/image";
import { MapPin, TrendingUp, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SaveArtistButton } from "@/components/save-artist-button";
import { formatMoney, type ArtistPublicStats } from "@/lib/types";
import { compact } from "@/lib/format";

export type DiscoverArtist = ArtistPublicStats & {
  engagement: number;
  heroImage: string | null;
  saved: boolean;
  dealStatus: string | null;
};

export function ArtistCard({ artist }: { artist: DiscoverArtist }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
      <SaveArtistButton
        artistId={artist.artist_id}
        initialSaved={artist.saved}
        className="absolute right-3 top-3 z-10"
      />
      {artist.dealStatus && (
        <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-1 text-xs font-medium text-white shadow-soft">
          <Check className="size-3" /> Deal sent
        </span>
      )}

      <Link href={`/artists/${artist.artist_id}`} className="block">
        {/* Hero: latest post or branded gradient */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
          {artist.heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.heroImage}
              alt={`Recent work by @${artist.username ?? "artist"}`}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="bg-hero flex size-full items-center justify-center text-4xl">
              💄
            </div>
          )}
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            {artist.profile_picture_url ? (
              <Image
                src={artist.profile_picture_url}
                alt={artist.username ?? ""}
                width={40}
                height={40}
                unoptimized
                className="size-10 rounded-full object-cover ring-2 ring-white"
              />
            ) : (
              <div className="size-10 rounded-full bg-muted" />
            )}
            <div className="min-w-0">
              <div className="truncate font-semibold text-navy">
                {artist.display_name ?? artist.username}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                @{artist.username}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-navy">
              <strong>{compact(artist.followers_count)}</strong>{" "}
              <span className="text-muted-foreground">followers</span>
            </span>
            <span className="inline-flex items-center gap-1 text-navy">
              <TrendingUp className="size-3.5 text-emerald-600" />
              <strong>{artist.engagement}%</strong>{" "}
              <span className="text-muted-foreground">eng.</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            {artist.location ? (
              <span className="inline-flex items-center gap-1 truncate text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" /> {artist.location}
              </span>
            ) : (
              <span />
            )}
            {artist.pricing === "fixed" && artist.price_min != null ? (
              <Badge variant="secondary" className="shrink-0">
                {formatMoney(artist.price_min, artist.currency)}
                {artist.price_max != null
                  ? `–${formatMoney(artist.price_max, artist.currency)}`
                  : "+"}
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0">
                Contact
              </Badge>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
