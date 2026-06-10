import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { EmptyState } from "@/components/empty-state";
import { CursorPager } from "@/components/cursor-pager";
import {
  formatMoney,
  type Deal,
  type ArtistPublicStats,
  type BrandPublic,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE = 20;

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect("/login");

  const isArtist = profile.role === "artist";
  const { before } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("deals")
    .select("*")
    .eq(isArtist ? "artist_id" : "brand_id", user.id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(PAGE + 1);
  if (before) query = query.lt("last_message_at", before);

  const { data } = await query;
  const rows = (data as Deal[]) ?? [];
  const hasMore = rows.length > PAGE;
  const deals = rows.slice(0, PAGE);
  const nextCursor = hasMore ? deals[deals.length - 1].last_message_at : null;

  // Resolve counterparties from public views.
  const names = new Map<string, { name: string; avatar: string | null }>();
  if (deals.length) {
    if (isArtist) {
      const brandIds = [...new Set(deals.map((d) => d.brand_id))];
      const { data: bp } = await supabase
        .from("brand_public")
        .select("*")
        .in("brand_id", brandIds);
      (bp as BrandPublic[] | null)?.forEach((b) =>
        names.set(b.brand_id, {
          name: b.company_name ?? "A brand",
          avatar: b.logo_url,
        })
      );
    } else {
      const artistIds = [...new Set(deals.map((d) => d.artist_id))];
      const { data: ap } = await supabase
        .from("artist_public_stats")
        .select("*")
        .in("artist_id", artistIds);
      (ap as ArtistPublicStats[] | null)?.forEach((a) =>
        names.set(a.artist_id, {
          name: a.display_name ?? `@${a.username}`,
          avatar: a.profile_picture_url,
        })
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">
          {isArtist ? "Your deals" : "Sent deals"}
        </h1>
        {!isArtist && (
          <Button asChild variant="accent">
            <Link href="/discover">Discover artists</Link>
          </Button>
        )}
      </div>

      {deals.length === 0 ? (
        isArtist ? (
          <EmptyState
            emoji="📬"
            title="Your inbox is empty — for now"
            body="When a brand sends you a PR collab offer, it'll show up here. Make sure you're connected and accepting deals so brands can find you."
            action={{ label: "Go to dashboard", href: "/dashboard" }}
          />
        ) : (
          <EmptyState
            emoji="✨"
            title="No deals sent yet"
            body="Browse opted-in artists and send your first PR collab offer. You'll track every response right here."
            action={{ label: "Discover artists", href: "/discover" }}
          />
        )
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => {
            const who = names.get(isArtist ? deal.brand_id : deal.artist_id);
            const myReadAt = isArtist ? deal.artist_read_at : deal.brand_read_at;
            const unread =
              !!deal.last_message_sender_id &&
              deal.last_message_sender_id !== user.id &&
              (!myReadAt ||
                (deal.last_message_at ?? "") > myReadAt);

            return (
              <Link key={deal.id} href={`/deals/${deal.id}`} className="block">
                <Card className="shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
                  <CardContent className="flex items-center gap-3">
                    <div className="relative">
                      {who?.avatar ? (
                        <Image
                          src={who.avatar}
                          alt={who.name}
                          width={44}
                          height={44}
                          unoptimized
                          className="size-11 rounded-full border object-cover"
                        />
                      ) : (
                        <div className="size-11 rounded-full bg-muted" />
                      )}
                      {unread && (
                        <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-yellow ring-2 ring-card" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`truncate ${unread ? "font-bold text-navy" : "font-medium text-navy"}`}
                        >
                          {who?.name ?? (isArtist ? "A brand" : "Artist")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(deal.last_message_at)}
                        </span>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {deal.offer_amount != null
                          ? `${formatMoney(deal.offer_amount, deal.currency)} · `
                          : ""}
                        {deal.product_description ?? deal.message ?? "Collab offer"}
                      </p>
                    </div>

                    <span className="flex items-center gap-1.5">
                      {deal.initiated_by === "artist" && (
                        <Badge variant="outline">Pitch</Badge>
                      )}
                      <DealStatusBadge status={deal.status} />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <CursorPager
        basePath="/deals"
        params={{}}
        nextCursor={nextCursor}
        hasCursor={!!before}
      />
    </div>
  );
}
