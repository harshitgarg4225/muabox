import { requireAdmin } from "@/lib/admin-auth";
import { Card, CardContent } from "@/components/ui/card";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { Badge } from "@/components/ui/badge";
import { CursorPager } from "@/components/cursor-pager";
import { formatMoney, type Deal } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE = 20;

export default async function AdminDeals({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const { admin } = await requireAdmin();
  const { before } = await searchParams;

  let query = admin
    .from("deals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(PAGE + 1);
  if (before) query = query.lt("created_at", before);

  const { data } = await query;
  const rows = (data as Deal[]) ?? [];
  const hasMore = rows.length > PAGE;
  const deals = rows.slice(0, PAGE);
  const nextCursor = hasMore ? deals[deals.length - 1].created_at : null;

  // Resolve party names in one query.
  const ids = [
    ...new Set(deals.flatMap((d) => [d.brand_id, d.artist_id])),
  ];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    (profs ?? []).forEach((p) =>
      names.set(p.id, p.full_name || p.email || "—")
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">Deals</h1>
      <Card>
        <CardContent className="divide-y p-0">
          {deals.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No deals.</p>
          ) : (
            deals.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-navy">
                    {names.get(d.brand_id) ?? "Brand"} →{" "}
                    {names.get(d.artist_id) ?? "Artist"}
                  </div>
                  <div className="text-muted-foreground">
                    {d.offer_amount != null
                      ? formatMoney(d.offer_amount, d.currency)
                      : "To discuss"}{" "}
                    · {new Date(d.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.paid_at && <Badge>paid</Badge>}
                  <DealStatusBadge status={d.status} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <CursorPager
        basePath="/admin/deals"
        params={{}}
        nextCursor={nextCursor}
        hasCursor={!!before}
      />
    </div>
  );
}
