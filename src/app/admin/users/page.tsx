import { requireAdmin } from "@/lib/admin-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminUserActions } from "@/components/admin-user-actions";
import { CursorPager } from "@/components/cursor-pager";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE = 20;

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; before?: string }>;
}) {
  const { user, admin } = await requireAdmin();
  const { q, before } = await searchParams;

  let query = admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(PAGE + 1);

  if (q) {
    const safe = q.replace(/[,%]/g, " ").trim();
    if (safe) query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
  }
  if (before) query = query.lt("created_at", before);

  const { data } = await query;
  const rows = (data as Profile[]) ?? [];
  const hasMore = rows.length > PAGE;
  const users = rows.slice(0, PAGE);
  const nextCursor = hasMore ? users[users.length - 1].created_at : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">Users</h1>

      <form className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Search name or email" />
        <Button type="submit" variant="accent">
          Search
        </Button>
      </form>

      <Card>
        <CardContent className="divide-y p-0">
          {users.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No users found.</p>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-navy">
                      {u.full_name ?? "—"}
                    </span>
                    <Badge variant="outline">{u.role}</Badge>
                    {u.is_admin && <Badge>admin</Badge>}
                    {u.suspended && <Badge variant="destructive">suspended</Badge>}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {u.email} · joined{" "}
                    {new Date(u.created_at).toLocaleDateString()}
                  </div>
                </div>
                <AdminUserActions
                  userId={u.id}
                  suspended={u.suspended}
                  isAdmin={u.is_admin}
                  isSelf={u.id === user.id}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <CursorPager
        basePath="/admin/users"
        params={{ q }}
        nextCursor={nextCursor}
        hasCursor={!!before}
      />
    </div>
  );
}
