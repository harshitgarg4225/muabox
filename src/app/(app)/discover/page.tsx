import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ArtistCard, type DiscoverArtist } from "@/components/artist-card";
import { engagementRate } from "@/lib/instagram";
import type {
  ArtistPublicStats,
  ArtistPublicMedia,
  Deal,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const TIERS: Record<string, { gte?: number; lt?: number }> = {
  nano: { lt: 10_000 },
  micro: { gte: 10_000, lt: 100_000 },
  mid: { gte: 100_000, lt: 500_000 },
  macro: { gte: 500_000 },
};

const selectClass =
  "border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    location?: string;
    tier?: string;
    pricing?: string;
    min_eng?: string;
    sort?: string;
    saved?: string;
  }>;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect("/login");
  if (profile.role !== "brand") redirect("/dashboard");

  const { q, location, tier, pricing, min_eng, sort, saved } =
    await searchParams;

  const supabase = await createClient();

  let query = supabase.from("artist_public_stats").select("*").limit(200);

  if (q) {
    const safe = q.replace(/[,%]/g, " ").trim();
    if (safe) {
      query = query.or(`display_name.ilike.%${safe}%,username.ilike.%${safe}%`);
    }
  }
  if (location) query = query.ilike("location", `%${location}%`);
  if (pricing === "fixed" || pricing === "custom") {
    query = query.eq("pricing", pricing);
  }
  if (tier && TIERS[tier]) {
    const { gte, lt } = TIERS[tier];
    if (gte != null) query = query.gte("followers_count", gte);
    if (lt != null) query = query.lt("followers_count", lt);
  }

  const { data } = await query;
  const baseArtists = (data as ArtistPublicStats[]) ?? [];
  const ids = baseArtists.map((a) => a.artist_id);

  // Engagement + hero image (latest post) for each artist, in one query.
  const engagementByArtist = new Map<string, number>();
  const heroByArtist = new Map<string, string | null>();
  if (ids.length) {
    const { data: mediaRows } = await supabase
      .from("artist_public_media")
      .select(
        "artist_id, like_count, comments_count, media_type, media_url, thumbnail_url, posted_at"
      )
      .in("artist_id", ids);

    const grouped = new Map<string, ArtistPublicMedia[]>();
    (mediaRows as ArtistPublicMedia[] | null)?.forEach((m) => {
      const arr = grouped.get(m.artist_id) ?? [];
      arr.push(m);
      grouped.set(m.artist_id, arr);
    });

    for (const a of baseArtists) {
      const rows = grouped.get(a.artist_id) ?? [];
      engagementByArtist.set(
        a.artist_id,
        engagementRate(rows, a.followers_count)
      );
      const latest = [...rows].sort((x, y) =>
        (y.posted_at ?? "").localeCompare(x.posted_at ?? "")
      )[0];
      const hero = latest
        ? latest.media_type === "VIDEO"
          ? latest.thumbnail_url
          : latest.media_url ?? latest.thumbnail_url
        : null;
      heroByArtist.set(a.artist_id, hero ?? null);
    }
  }

  // Which artists has this brand already messaged / saved?
  const dealStatusByArtist = new Map<string, string>();
  const { data: dealRows } = await supabase
    .from("deals")
    .select("artist_id, status, created_at")
    .eq("brand_id", user.id)
    .order("created_at", { ascending: false });
  (dealRows as Pick<Deal, "artist_id" | "status">[] | null)?.forEach((d) => {
    if (!dealStatusByArtist.has(d.artist_id)) {
      dealStatusByArtist.set(d.artist_id, d.status);
    }
  });

  const { data: savedRows } = await supabase
    .from("saved_artists")
    .select("artist_id")
    .eq("brand_id", user.id);
  const savedSet = new Set(
    (savedRows as { artist_id: string }[] | null)?.map((r) => r.artist_id) ?? []
  );

  // Enrich, filter by engagement / saved, then sort.
  let artists: DiscoverArtist[] = baseArtists.map((a) => ({
    ...a,
    engagement: engagementByArtist.get(a.artist_id) ?? 0,
    heroImage: heroByArtist.get(a.artist_id) ?? null,
    saved: savedSet.has(a.artist_id),
    dealStatus: dealStatusByArtist.get(a.artist_id) ?? null,
  }));

  const minEng = min_eng ? Number(min_eng) : 0;
  if (minEng > 0) artists = artists.filter((a) => a.engagement >= minEng);
  if (saved) artists = artists.filter((a) => a.saved);

  artists.sort((a, b) => {
    if (sort === "engagement") return b.engagement - a.engagement;
    if (sort === "newest")
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    return (b.followers_count ?? 0) - (a.followers_count ?? 0);
  });

  const hasFilters = !!(q || location || tier || pricing || min_eng || saved);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Discover artists</h1>
          <p className="text-sm text-muted-foreground">
            {artists.length} {artists.length === 1 ? "artist" : "artists"}
            {saved ? " saved" : " accepting deals"}
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-secondary p-1 text-sm">
          <ScopeChip label="All" href="/discover" active={!saved} />
          <ScopeChip
            label="♥ Saved"
            href="/discover?saved=1"
            active={!!saved}
          />
        </div>
      </div>

      <form className="space-y-3 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search by name or @username"
            className="pl-9"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              defaultValue={location}
              placeholder="Any"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tier">Followers</Label>
            <select id="tier" name="tier" defaultValue={tier ?? ""} className={selectClass}>
              <option value="">Any size</option>
              <option value="nano">Nano · under 10K</option>
              <option value="micro">Micro · 10K–100K</option>
              <option value="mid">Mid · 100K–500K</option>
              <option value="macro">Macro · 500K+</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="min_eng">Min engagement %</Label>
            <Input
              id="min_eng"
              name="min_eng"
              type="number"
              min={0}
              step="0.5"
              defaultValue={min_eng}
              placeholder="Any"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pricing">Pricing</Label>
            <select
              id="pricing"
              name="pricing"
              defaultValue={pricing ?? ""}
              className={selectClass}
            >
              <option value="">Any</option>
              <option value="fixed">Fixed price</option>
              <option value="custom">Contact for quote</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <Label htmlFor="sort">Sort by</Label>
            <select id="sort" name="sort" defaultValue={sort ?? "followers"} className={selectClass}>
              <option value="followers">Most followers</option>
              <option value="engagement">Highest engagement</option>
              <option value="newest">Newest</option>
            </select>
          </div>
          {saved && <input type="hidden" name="saved" value="1" />}
          <div className="flex gap-2">
            <Button type="submit" variant="accent">
              Apply filters
            </Button>
            <Button asChild variant="outline">
              <Link href={saved ? "/discover?saved=1" : "/discover"}>Reset</Link>
            </Button>
          </div>
        </div>
      </form>

      {artists.length === 0 ? (
        saved ? (
          <EmptyState
            emoji="♥"
            title="Your shortlist is empty"
            body="Tap the heart on any artist to save them here for later. Build a shortlist before you reach out."
            action={{ label: "Browse all artists", href: "/discover" }}
          />
        ) : hasFilters ? (
          <EmptyState
            emoji="🔍"
            title="No artists match those filters"
            body="Try widening the follower tier, lowering min engagement, or clearing the location."
            action={{ label: "Clear filters", href: "/discover" }}
          />
        ) : (
          <EmptyState
            emoji="💄"
            title="New artists are joining every day"
            body="No creators are accepting deals just yet. Check back soon — we'll have fresh faces for your next collab."
          />
        )
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((a) => (
            <ArtistCard key={a.artist_id} artist={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScopeChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 font-medium transition-colors ${
        active ? "bg-navy text-white" : "text-muted-foreground hover:text-navy"
      }`}
    >
      {label}
    </Link>
  );
}
