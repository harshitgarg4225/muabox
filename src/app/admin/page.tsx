import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/types";

export const dynamic = "force-dynamic";

async function tableCount(admin: SupabaseClient, table: string) {
  const { count } = await admin
    .from(table)
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export default async function AdminOverview() {
  const { admin } = await requireAdmin();

  const [artists, brands, igAccounts, deals] = await Promise.all([
    tableCount(admin, "artists"),
    tableCount(admin, "brands"),
    tableCount(admin, "instagram_accounts"),
    tableCount(admin, "deals"),
  ]);

  const { count: suspended } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("suspended", true);

  const { count: acceptedDeals } = await admin
    .from("deals")
    .select("*", { count: "exact", head: true })
    .eq("status", "accepted");
  const { count: paidDeals } = await admin
    .from("deals")
    .select("*", { count: "exact", head: true })
    .not("paid_at", "is", null);

  const { data: paidPayments } = await admin
    .from("payments")
    .select("amount, transferred_amount, transfer_status")
    .eq("status", "paid")
    .limit(10000);

  const gmv = (paidPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
  const paidOut = (paidPayments ?? []).reduce(
    (s, p) => s + (p.transferred_amount ?? 0),
    0
  );
  const pendingPayouts = (paidPayments ?? []).filter(
    (p) => p.transfer_status === "pending" || p.transfer_status === "failed"
  ).length;

  const { data: recent } = await admin
    .from("profiles")
    .select("id, full_name, email, role, created_at, suspended")
    .order("created_at", { ascending: false })
    .limit(8);

  const stats = [
    { label: "Artists", value: artists },
    { label: "Brands", value: brands },
    { label: "Instagram connected", value: igAccounts },
    { label: "Deals", value: deals },
    { label: "Accepted", value: acceptedDeals ?? 0 },
    { label: "Paid deals", value: paidDeals ?? 0 },
    { label: "Suspended users", value: suspended ?? 0 },
    { label: "Pending payouts", value: pendingPayouts },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Overview</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-navy">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-muted-foreground">Gross volume (paid)</div>
            <div className="text-3xl font-bold text-navy">
              {formatMoney(gmv, "INR")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-muted-foreground">Paid out to artists</div>
            <div className="text-3xl font-bold text-navy">
              {formatMoney(paidOut, "INR")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">Recent signups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(recent ?? []).map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <span className="font-medium text-navy">
                  {p.full_name ?? "—"}
                </span>{" "}
                <span className="text-muted-foreground">{p.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{p.role}</Badge>
                {p.suspended && <Badge variant="destructive">suspended</Badge>}
                <span className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
          <Link href="/admin/users" className="inline-block text-sm underline">
            View all users
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
