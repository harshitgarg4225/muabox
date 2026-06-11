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
import { LocalDate } from "@/components/local-date";
import {
  formatMoney,
  type Deal,
  type ArtistPublicStats,
  type BrandPublic,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE = 20;


const SCOPES = ["action", "waiting", "accepted", "pitches"] as const;
type Scope = (typeof SCOPES)[number] | undefined;

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string; scope?: string }>;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect("/login");

  const isArtist = profile.role === "artist";
  const { before, scope: rawScope } = await searchParams;
  const scope: Scope = (SCOPES as readonly string[]).includes(rawScope ?? "")
    ? (rawScope as Scope)
    : undefined;
  const supabase = await createClient();

  let query = supabase
    .from("deals")
    .select("*")
    .eq(isArtist ? "artist_id" : "brand_id", user.id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(PAGE + 1);

  // Triage scopes — so nobody hunts through one long list. "action" (artist:
  // offers awaiting me) and "waiting" (brand: invites awaiting them) are the
  // same filter; the role scoping above flips who's who.
  if (scope === "action" || scope === "waiting") {
    query = query
      .eq("initiated_by", "brand")
      .in("status", ["sent", "viewed"]);
  } else if (scope === "accepted") {
    query = query.in("status", ["accepted", "completed"]);
  } else if (scope === "pitches") {
    query = query.eq("initiated_by", "artist");
  }

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
          {isArtist ? "Your deals" : "Your deals"}
        </h1>
        {!isArtist && (
          <Button asChild variant="accent">
            <Link href="/discover">Discover artists</Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1 rounded-full bg-secondary p-1 text-sm w-fit">
        {(isArtist
          ? [
              { key: undefined, label: "All" },
              { key: "action", label: "Needs reply" },
              { key: "accepted", label: "Accepted" },
              { key: "pitches", label: "My pitches" },
            ]
          : [
              { key: undefined, label: "All" },
              { key: "pitches", label: "Pitches" },
              { key: "waiting", label: "Awaiting reply" },
              { key: "accepted", label: "Accepted" },
            ]
        ).map((t) => {
          const active = scope === t.key;
          return (
            <Link
              key={t.label}
              href={t.key ? `/deals?scope=${t.key}` : "/deals"}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                active ? "bg-navy text-white" : "text-muted-foreground hover:text-navy"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {deals.length === 0 && scope ? (
        <EmptyState
          emoji="🗂️"
          title="Nothing here right now"
          body="This view is empty — switch back to All to see every conversation."
          action={{ label: "Show all deals", href: "/deals" }}
        />
      ) : deals.length === 0 ? (
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
                          <LocalDate iso={deal.last_message_at} mode="relative" />
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
        params={{ scope }}
        nextCursor={nextCursor}
        hasCursor={!!before}
      />
    </div>
  );
}
