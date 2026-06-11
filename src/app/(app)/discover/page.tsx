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
import { CursorPager } from "@/components/cursor-pager";
import { SPECIALTIES } from "@/lib/specialties";
import type {
  ArtistPublicStats,
  ArtistPublicMedia,
  Deal,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE = 24;

const TIERS: Record<string, { gte?: number; lt?: number }> = {
  nano: { lt: 10_000 },
  micro: { gte: 10_000, lt: 100_000 },
  mid: { gte: 100_000, lt: 500_000 },
  macro: { gte: 500_000 },
};

const SORT_COL: Record<string, string> = {
  followers: "followers_count",
  engagement: "engagement_rate",
  newest: "created_at",
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
    before?: string;
    specialty?: string;
  }>;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect("/login");
  if (profile.role !== "brand") redirect("/dashboard");

  const { q, location, tier, pricing, min_eng, sort, saved, before, specialty } =
    await searchParams;

  const supabase = await createClient();

  // Saved shortlist (needed both for the "Saved" scope and heart state).
  const { data: savedRows } = await supabase
    .from("saved_artists")
    .select("artist_id")
    .eq("brand_id", user.id);
  const savedSet = new Set(
    (savedRows as { artist_id: string }[] | null)?.map((r) => r.artist_id) ?? []
  );

  const sortKey = sort && SORT_COL[sort] ? sort : "followers";
  const sortCol = SORT_COL[sortKey];
  const numericCursor = sortCol !== "created_at";

  let query = supabase
    .from("artist_public_stats")
    .select("*")
    .order(sortCol, { ascending: false, nullsFirst: false })
    .limit(PAGE + 1);

  if (q) {
    const safe = q.replace(/[,%]/g, " ").trim();
    if (safe) query = query.or(`display_name.ilike.%${safe}%,username.ilike.%${safe}%`);
  }
  if (location) query = query.ilike("location", `%${location}%`);
  if (pricing === "fixed" || pricing === "custom") query = query.eq("pricing", pricing);
  if (tier && TIERS[tier]) {
    const { gte, lt } = TIERS[tier];
    if (gte != null) query = query.gte("followers_count", gte);
    if (lt != null) query = query.lt("followers_count", lt);
  }
  if (min_eng && Number(min_eng) > 0) {
    query = query.gte("engagement_rate", Number(min_eng));
  }
  if (specialty && (SPECIALTIES as readonly string[]).includes(specialty)) {
    query = query.contains("specialties", [specialty]);
  }
  if (saved) {
    const ids = [...savedSet];
    query = query.in("artist_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  if (before) {
    query = query.lt(sortCol, numericCursor ? Number(before) : before);
  }

  const { data } = await query;
  const rows = (data as ArtistPublicStats[]) ?? [];
  const hasMore = rows.length > PAGE;
  const pageRows = rows.slice(0, PAGE);
  const last = pageRows[pageRows.length - 1] as
    | (ArtistPublicStats & Record<string, unknown>)
    | undefined;
  const lastVal = last ? last[sortCol] : null;
  const nextCursor = hasMore && lastVal != null ? String(lastVal) : null;

  const ids = pageRows.map((a) => a.artist_id);

  // Latest post (hero) per artist — bounded to this page.
  const heroByArtist = new Map<string, string | null>();
  if (ids.length) {
    const { data: mediaRows } = await supabase
      .from("artist_public_media")
      .select("artist_id, media_type, media_url, thumbnail_url, posted_at")
      .in("artist_id", ids);
    const latest = new Map<string, ArtistPublicMedia>();
    (mediaRows as ArtistPublicMedia[] | null)?.forEach((m) => {
      const cur = latest.get(m.artist_id);
      if (!cur || (m.posted_at ?? "") > (cur.posted_at ?? "")) {
        latest.set(m.artist_id, m);
      }
    });
    for (const a of pageRows) {
      const m = latest.get(a.artist_id);
      heroByArtist.set(
        a.artist_id,
        m ? (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url ?? m.thumbnail_url) : null
      );
    }
  }

  // Which of these has the brand already messaged?
  const dealStatusByArtist = new Map<string, string>();
  if (ids.length) {
    const { data: dealRows } = await supabase
      .from("deals")
      .select("artist_id, status, created_at")
      .eq("brand_id", user.id)
      .in("artist_id", ids)
      .order("created_at", { ascending: false });
    (dealRows as Pick<Deal, "artist_id" | "status">[] | null)?.forEach((d) => {
      if (!dealStatusByArtist.has(d.artist_id)) dealStatusByArtist.set(d.artist_id, d.status);
    });
  }

  const artists: DiscoverArtist[] = pageRows.map((a) => ({
    ...a,
    engagement: a.engagement_rate ?? 0,
    heroImage: heroByArtist.get(a.artist_id) ?? null,
    saved: savedSet.has(a.artist_id),
    dealStatus: dealStatusByArtist.get(a.artist_id) ?? null,
  }));

  const hasFilters = !!(
    q || location || tier || pricing || min_eng || saved || specialty
  );
  const pagerParams = { q, location, tier, pricing, min_eng, sort, saved, specialty };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Discover artists</h1>
          <p className="text-sm text-muted-foreground">
            {saved ? "Your shortlist" : "Artists accepting deals"}
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-secondary p-1 text-sm">
          <ScopeChip label="All" href="/discover" active={!saved} />
          <ScopeChip label="♥ Saved" href="/discover?saved=1" active={!!saved} />
        </div>
      </div>

      <form className="space-y-3 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search by name or @username" className="pl-9" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue={location} placeholder="Any" />
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
            <Label htmlFor="specialty">Specialty</Label>
            <select id="specialty" name="specialty" defaultValue={specialty ?? ""} className={selectClass}>
              <option value="">Any niche</option>
              {SPECIALTIES.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="min_eng">Min engagement %</Label>
            <Input id="min_eng" name="min_eng" type="number" min={0} step="0.5" defaultValue={min_eng} placeholder="Any" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pricing">Pricing</Label>
            <select id="pricing" name="pricing" defaultValue={pricing ?? ""} className={selectClass}>
              <option value="">Any</option>
              <option value="fixed">Fixed price</option>
              <option value="custom">Contact for quote</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <Label htmlFor="sort">Sort by</Label>
            <select id="sort" name="sort" defaultValue={sortKey} className={selectClass}>
              <option value="followers">Most followers</option>
              <option value="engagement">Highest engagement</option>
              <option value="newest">Newest</option>
            </select>
          </div>
          {saved && <input type="hidden" name="saved" value="1" />}
          <div className="flex gap-2">
            <Button type="submit" variant="accent">Apply filters</Button>
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
            body="Tap the heart on any artist to save them here for later."
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
            body="No creators are accepting deals just yet. Know a makeup artist who'd be perfect for your campaigns? Invite them — it takes two minutes to join."
            secondary={{
              label: "Invite an artist you love",
              href: `mailto:?subject=${encodeURIComponent(
                "You should be on Muabox"
              )}&body=${encodeURIComponent(
                "Hey! I'm looking for makeup artists for brand collaborations on Muabox — you connect your Instagram, set your rates, and brands send you paid deals. Join here: " +
                  (process.env.NEXT_PUBLIC_APP_URL ?? "https://muabox.vercel.app") +
                  "/login?role=artist"
              )}`,
            }}
          />
        )
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((a) => (
              <ArtistCard key={a.artist_id} artist={a} />
            ))}
          </div>
          <CursorPager
            basePath="/discover"
            params={pagerParams}
            nextCursor={nextCursor}
            hasCursor={!!before}
          />
        </>
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
