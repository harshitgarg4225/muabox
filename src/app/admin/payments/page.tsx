import { requireAdmin } from "@/lib/admin-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CursorPager } from "@/components/cursor-pager";
import { formatMoney, type Payment } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE = 20;

const TRANSFER_LABEL: Record<string, string> = {
  none: "—",
  pending: "payout pending",
  done: "paid out",
  failed: "payout failed",
};

export default async function AdminPayments({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const { admin } = await requireAdmin();
  const { before } = await searchParams;

  let query = admin
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(PAGE + 1);
  if (before) query = query.lt("created_at", before);

  const { data } = await query;
  const rows = (data as Payment[]) ?? [];
  const hasMore = rows.length > PAGE;
  const payments = rows.slice(0, PAGE);
  const nextCursor = hasMore ? payments[payments.length - 1].created_at : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">Payments</h1>
      <Card>
        <CardContent className="divide-y p-0">
          {payments.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No payments.</p>
          ) : (
            payments.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-navy">
                    {formatMoney(p.amount, p.currency)}
                    {p.transferred_amount != null && (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {formatMoney(p.transferred_amount, p.currency)} to artist
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {p.razorpay_order_id} ·{" "}
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={p.status === "paid" ? "default" : "secondary"}
                    className={p.status === "paid" ? "bg-emerald-600 text-white" : ""}
                  >
                    {p.status}
                  </Badge>
                  <Badge variant="outline">
                    {TRANSFER_LABEL[p.transfer_status] ?? p.transfer_status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <CursorPager
        basePath="/admin/payments"
        params={{}}
        nextCursor={nextCursor}
        hasCursor={!!before}
      />
    </div>
  );
}
