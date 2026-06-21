import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { RemindButton } from "@/components/remind-button";
import { CampaignStatusButton } from "@/components/campaign-status-button";
import { DuplicateCampaignButton } from "@/components/duplicate-campaign-button";
import {
  BulkInviteForm,
  type InvitableArtist,
} from "@/components/bulk-invite-form";
import { CampaignBriefForm } from "@/components/campaign-brief-form";
import {
  PromoCodesManager,
  type PromoRow,
} from "@/components/promo-codes-manager";
import { compact } from "@/lib/format";
import { compensationLabel } from "@/lib/pricing";
import {
  formatMoney,
  type Campaign,
  type Deal,
  type ArtistPublicStats,
  type PromoCode,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect("/login");
  if (profile.role !== "brand") redirect("/dashboard");

  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("brand_id", user.id)
    .maybeSingle<Campaign>();
  if (!campaign) notFound();

  const { data: dealRows } = await supabase
    .from("deals")
    .select("*")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false });
  const deals = (dealRows as Deal[]) ?? [];

  // ---- ROI rollup ----
  const invited = deals.length;
  const responded = deals.filter(
    (d) => d.status !== "sent" && d.status !== "viewed"
  ).length;
  const acceptedDeals = deals.filter(
    (d) => d.status === "accepted" || d.status === "completed"
  );
  // "Committed" = every live (non-declined) offer's money — the same figure the
  // bulk-invite budget guard reserves, so the bar and the guard agree.
  const committed = deals
    .filter((d) => d.status !== "declined")
    .reduce((s, d) => s + (d.offer_amount ?? 0), 0);
  const spent = deals
    .filter((d) => d.paid_at)
    .reduce((s, d) => s + (d.offer_amount ?? 0), 0);
  const remaining =
    campaign.budget != null ? Math.max(0, campaign.budget - committed) : null;
  const responseRate = invited > 0 ? Math.round((responded / invited) * 100) : 0;

  // Stats for every artist on the campaign (one query).
  const artistIds = [...new Set(deals.map((d) => d.artist_id))];
  const statsById = new Map<string, ArtistPublicStats>();
  if (artistIds.length) {
    const { data: ap } = await supabase
      .from("artist_public_stats")
      .select("*")
      .in("artist_id", artistIds);
    (ap as ArtistPublicStats[] | null)?.forEach((a) =>
      statsById.set(a.artist_id, a)
    );
  }

  // Promo codes on this campaign → attributed-sales rollup + manager rows.
  const { data: promoRows } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false });
  const promoCodes = (promoRows as PromoCode[] | null) ?? [];
  const artistName = (aid: string) => {
    const a = statsById.get(aid);
    return a?.display_name ?? a?.username ?? "Artist";
  };
  const promoManagerRows: PromoRow[] = promoCodes.map((p) => ({
    ...p,
    artistName: artistName(p.artist_id),
  }));
  const codeRedemptions = promoCodes.reduce((s, p) => s + p.redemptions, 0);
  const codeRevenue = promoCodes.reduce((s, p) => s + p.revenue, 0);
  // Artists on the campaign who don't yet have a code (for the assign dropdown).
  const codedArtists = new Set(promoCodes.map((p) => p.artist_id));
  const assignableArtists = [...new Set(deals.map((d) => d.artist_id))]
    .filter((aid) => !codedArtists.has(aid))
    .map((aid) => ({ id: aid, name: artistName(aid) }));

  const acceptedStats = acceptedDeals
    .map((d) => statsById.get(d.artist_id))
    .filter((a): a is ArtistPublicStats => !!a);
  const reach = acceptedStats.reduce(
    (s, a) => s + (a.followers_count ?? 0),
    0
  );
  const avgEng =
    acceptedStats.length > 0
      ? Math.round(
          (acceptedStats.reduce((s, a) => s + (a.engagement_rate ?? 0), 0) /
            acceptedStats.length) *
            10
        ) / 10
      : 0;
  const estEngaged = Math.round((reach * avgEng) / 100);
  const costPer1k =
    spent > 0 && reach > 0 ? Math.round(spent / (reach / 1000)) : null;

  // Audience snapshot of accepted artists: top locations + tier mix.
  const locations = new Map<string, number>();
  let nano = 0,
    micro = 0,
    midMacro = 0;
  for (const a of acceptedStats) {
    if (a.location) {
      const key = a.location.trim();
      locations.set(key, (locations.get(key) ?? 0) + 1);
    }
    const f = a.followers_count ?? 0;
    if (f < 10_000) nano++;
    else if (f < 100_000) micro++;
    else midMacro++;
  }
  const topLocations = [...locations.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 3);

  // Shortlisted artists not yet on this campaign → bulk invite pool.
  const { data: savedRows } = await supabase
    .from("saved_artists")
    .select("artist_id")
    .eq("brand_id", user.id);
  const invitedSet = new Set(artistIds);
  const inviteIds = (
    (savedRows as { artist_id: string }[] | null) ?? []
  )
    .map((r) => r.artist_id)
    .filter((aid) => !invitedSet.has(aid));

  let invitable: InvitableArtist[] = [];
  if (inviteIds.length) {
    const { data: pool } = await supabase
      .from("artist_public_stats")
      .select("*")
      .in("artist_id", inviteIds)
      .order("followers_count", { ascending: false, nullsFirst: false })
      .limit(50);
    const targets = campaign.target_specialties ?? [];
    const perArtistBudget =
      campaign.budget != null ? campaign.budget : null;
    invitable = ((pool as ArtistPublicStats[] | null) ?? [])
      .map((a) => {
        // Specialty fit (50), engagement (30), budget fit (20).
        let specialtyScore = 25;
        if (targets.length > 0) {
          const overlap = (a.specialties ?? []).filter((s) =>
            targets.includes(s)
          ).length;
          specialtyScore = Math.round((overlap / targets.length) * 50);
        }
        const engScore = Math.min(a.engagement_rate ?? 0, 10) * 3; // 0–30
        let budgetScore = 10;
        if (perArtistBudget != null) {
          budgetScore =
            a.min_budget == null || a.min_budget <= perArtistBudget ? 20 : 0;
        }
        const match = Math.min(
          100,
          Math.round(specialtyScore + engScore + budgetScore)
        );
        return {
          artist_id: a.artist_id,
          name: a.display_name ?? a.username ?? "Artist",
          username: a.username,
          avatar: a.profile_picture_url,
          followers: a.followers_count,
          engagement: a.engagement_rate,
          match,
        };
      })
      .sort((x, y) => y.match - x.match);
  }

  const roi = [
    {
      label: "Budget",
      value: campaign.budget != null ? formatMoney(campaign.budget, "INR") : "Open",
    },
    { label: "Committed", value: formatMoney(committed, "INR") },
    { label: "Spent", value: formatMoney(spent, "INR") },
    {
      label: "Remaining",
      value: remaining != null ? formatMoney(remaining, "INR") : "—",
    },
    { label: "Response rate", value: `${responseRate}%` },
    { label: "Total reach", value: compact(reach) },
    { label: "Avg engagement", value: `${avgEng}%` },
    {
      label: "Est. cost / 1K reach",
      value: costPer1k != null ? formatMoney(costPer1k, "INR") : "—",
    },
    ...(promoCodes.length > 0
      ? [
          { label: "Code redemptions", value: compact(codeRedemptions) },
          { label: "Sales via codes", value: formatMoney(codeRevenue, "INR") },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/campaigns">
          <ArrowLeft /> All campaigns
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-navy">{campaign.name}</h1>
            <Badge
              variant={campaign.status === "active" ? "default" : "outline"}
              className={
                campaign.status === "active" ? "bg-emerald-600 text-white" : ""
              }
            >
              {campaign.status}
            </Badge>
          </div>
          {campaign.product && (
            <p className="text-sm text-muted-foreground">{campaign.product}</p>
          )}
        </div>
        <div className="flex gap-2">
          <DuplicateCampaignButton campaignId={campaign.id} />
          <CampaignStatusButton campaignId={campaign.id} status={campaign.status} />
        </div>
      </div>

      {(campaign.compensation_type ||
        campaign.offer_description ||
        campaign.product ||
        campaign.description) && (
        <Card>
          <CardContent className="grid gap-3 py-4 text-sm sm:grid-cols-2">
            {compensationLabel(campaign.compensation_type) && (
              <div>
                <span className="font-medium text-navy">Offering: </span>
                {compensationLabel(campaign.compensation_type)}
                {campaign.offer_description ? ` · ${campaign.offer_description}` : ""}
                {campaign.product_value != null
                  ? ` · product worth ${formatMoney(campaign.product_value, "INR")}`
                  : ""}
              </div>
            )}
            {campaign.product && (
              <div>
                <span className="font-medium text-navy">Deliverables: </span>
                {campaign.product}
              </div>
            )}
            {campaign.description && (
              <div className="sm:col-span-2 text-muted-foreground">
                {campaign.description}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Creative brief */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">Creative brief</CardTitle>
          <CardDescription>
            Required hashtags, mentions and do&apos;s &amp; don&apos;ts — every
            artist on this campaign sees these on their deal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignBriefForm
            campaignId={campaign.id}
            requiredHashtags={campaign.required_hashtags ?? []}
            requiredMentions={campaign.required_mentions ?? []}
            dos={campaign.dos}
            donts={campaign.donts}
            disclosureRequired={campaign.disclosure_required}
          />
        </CardContent>
      </Card>

      {/* ROI summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {roi.map((m) => (
          <Card key={m.label}>
            <CardContent className="py-4">
              <div className="text-xl font-bold text-navy">{m.value}</div>
              <div className="text-xs text-muted-foreground">{m.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Promo codes for sales attribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">
            Promo codes &amp; sales
          </CardTitle>
          <CardDescription>
            Give each creator a unique code, then log redemptions and sales to
            see the real revenue this campaign drove.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PromoCodesManager
            campaignId={campaign.id}
            codes={promoManagerRows}
            assignableArtists={assignableArtists}
          />
        </CardContent>
      </Card>

      {/* Audience snapshot */}
      {acceptedStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-navy">
              <Users className="size-4" /> Audience snapshot
            </CardTitle>
            <CardDescription>
              The combined audience of your {acceptedStats.length} accepted{" "}
              {acceptedStats.length === 1 ? "artist" : "artists"} — est.{" "}
              {compact(estEngaged)} actively engaged followers.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6 text-sm">
            <div>
              <div className="font-medium text-navy">Top locations</div>
              {topLocations.length ? (
                topLocations.map(([loc, n]) => (
                  <div key={loc} className="text-muted-foreground">
                    {loc} · {n}
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">—</div>
              )}
            </div>
            <div>
              <div className="font-medium text-navy">Creator mix</div>
              <div className="text-muted-foreground">
                {nano} nano · {micro} micro · {midMacro} mid/macro
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invites */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">
            Invites ({invited})
          </CardTitle>
          <CardDescription>
            Track every artist on this campaign. Nudge anyone who hasn&apos;t
            replied — once per 48 hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {deals.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No invites yet — select artists below to get started.
            </p>
          ) : (
            deals.map((d) => {
              const a = statsById.get(d.artist_id);
              const pendingReply = d.status === "sent" || d.status === "viewed";
              return (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <Link
                    href={`/deals/${d.id}`}
                    className="flex min-w-0 items-center gap-3"
                  >
                    {a?.profile_picture_url ? (
                      <Image
                        src={a.profile_picture_url}
                        alt=""
                        width={36}
                        height={36}
                        unoptimized
                        className="size-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="size-9 rounded-full bg-muted" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-navy hover:underline">
                        {a?.display_name ?? a?.username ?? "Artist"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {d.offer_amount != null
                          ? formatMoney(d.offer_amount, d.currency)
                          : "To discuss"}
                        {d.paid_at ? " · paid" : ""}
                      </span>
                    </span>
                  </Link>
                  <div className="flex items-center gap-2">
                    {pendingReply && campaign.status === "active" && (
                      <RemindButton dealId={d.id} remindedAt={d.reminded_at} />
                    )}
                    <DealStatusBadge status={d.status} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Bulk invite */}
      {campaign.status === "active" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-navy">
              Invite from your shortlist
            </CardTitle>
            <CardDescription>
              Pick saved artists and send one campaign invite to all of them at
              once{campaign.budget != null ? " — we'll keep cash offers inside your budget" : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BulkInviteForm campaignId={campaign.id} artists={invitable} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
