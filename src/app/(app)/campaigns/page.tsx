import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { CreateCampaignDialog } from "@/components/create-campaign-dialog";
import { formatMoney, type Campaign, type Deal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect("/login");
  if (profile.role !== "brand") redirect("/dashboard");

  const supabase = await createClient();

  const { data: campaignRows } = await supabase
    .from("campaigns")
    .select("*")
    .eq("brand_id", user.id)
    .order("created_at", { ascending: false });
  const campaigns = (campaignRows as Campaign[]) ?? [];

  // One query for all campaign deals → per-campaign rollups.
  const stats = new Map<
    string,
    { invited: number; accepted: number; committed: number; spent: number }
  >();
  if (campaigns.length) {
    const { data: dealRows } = await supabase
      .from("deals")
      .select("campaign_id, status, offer_amount, paid_at")
      .eq("brand_id", user.id)
      .not("campaign_id", "is", null);
    for (const d of (dealRows as Partial<Deal>[]) ?? []) {
      if (!d.campaign_id) continue;
      const s =
        stats.get(d.campaign_id) ??
        { invited: 0, accepted: 0, committed: 0, spent: 0 };
      s.invited++;
      if (d.status === "accepted" || d.status === "completed") {
        s.accepted++;
        s.committed += d.offer_amount ?? 0;
      }
      if (d.paid_at) s.spent += d.offer_amount ?? 0;
      stats.set(d.campaign_id, s);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Budgets, outreach at scale, and ROI in one place.
          </p>
        </div>
        <CreateCampaignDialog />
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="Launch your first campaign"
          body="Set a budget and a brief, invite shortlisted artists in one go, and track responses, committed spend and reach — all in one view."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => {
            const s = stats.get(c.id) ?? {
              invited: 0,
              accepted: 0,
              committed: 0,
              spent: 0,
            };
            const pct =
              c.budget && c.budget > 0
                ? Math.min(100, Math.round((s.committed / c.budget) * 100))
                : null;
            return (
              <Link key={c.id} href={`/campaigns/${c.id}`}>
                <Card className="h-full shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-navy">
                          {c.name}
                        </div>
                        {c.product && (
                          <div className="truncate text-sm text-muted-foreground">
                            {c.product}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={c.status === "active" ? "default" : "outline"}
                        className={
                          c.status === "active" ? "bg-emerald-600 text-white" : ""
                        }
                      >
                        {c.status}
                      </Badge>
                    </div>

                    {c.budget != null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {formatMoney(s.committed, "INR")} committed
                          </span>
                          <span>{formatMoney(c.budget, "INR")} budget</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-navy transition-all"
                            style={{ width: `${pct ?? 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4 text-sm">
                      <span>
                        <strong className="text-navy">{s.invited}</strong>{" "}
                        <span className="text-muted-foreground">invited</span>
                      </span>
                      <span>
                        <strong className="text-navy">{s.accepted}</strong>{" "}
                        <span className="text-muted-foreground">accepted</span>
                      </span>
                      <span>
                        <strong className="text-navy">
                          {formatMoney(s.spent, "INR")}
                        </strong>{" "}
                        <span className="text-muted-foreground">spent</span>
                      </span>
                    </div>

                    {c.target_specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {c.target_specialties.map((sp) => (
                          <Badge key={sp} variant="secondary">
                            {sp}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
