import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DealResponseButtons } from "@/components/deal-response-buttons";
import {
  formatMoney,
  type Deal,
  type DealStatus,
  type ArtistPublicStats,
  type BrandPublic,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_META: Record<
  DealStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  sent: {
    label: "New",
    variant: "secondary",
    className: "bg-yellow/20 text-yellow-600",
  },
  viewed: { label: "Viewed", variant: "outline" },
  accepted: {
    label: "Accepted",
    variant: "default",
    className: "bg-emerald-600 text-white",
  },
  declined: { label: "Declined", variant: "destructive" },
  completed: {
    label: "Completed",
    variant: "default",
    className: "bg-emerald-600 text-white",
  },
};

function StatusBadge({ status }: { status: DealStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta.variant} className={meta.className}>
      {meta.label}
    </Badge>
  );
}

function DealMeta({ deal }: { deal: Deal }) {
  return (
    <div className="space-y-2">
      {deal.message && <p className="text-sm">{deal.message}</p>}
      {deal.product_description && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Deliverables: </span>
          {deal.product_description}
        </p>
      )}
      <p className="text-sm">
        <span className="font-medium">Budget: </span>
        {deal.offer_amount != null
          ? formatMoney(deal.offer_amount, deal.currency)
          : "To discuss"}
      </p>
      <p className="text-xs text-muted-foreground">
        {new Date(deal.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}

export default async function DealsPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect("/login");

  return profile.role === "artist" ? (
    <ArtistInbox userId={user.id} />
  ) : (
    <BrandSent userId={user.id} />
  );
}

async function ArtistInbox({ userId }: { userId: string }) {
  const supabase = await createClient();

  // Opening the inbox marks pending offers as viewed.
  await supabase
    .from("deals")
    .update({ status: "viewed" })
    .eq("artist_id", userId)
    .eq("status", "sent");

  const { data } = await supabase
    .from("deals")
    .select("*")
    .eq("artist_id", userId)
    .order("created_at", { ascending: false });
  const deals = (data as Deal[]) ?? [];

  const brandIds = [...new Set(deals.map((d) => d.brand_id))];
  const brands = new Map<string, BrandPublic>();
  if (brandIds.length) {
    const { data: bp } = await supabase
      .from("brand_public")
      .select("*")
      .in("brand_id", brandIds);
    (bp as BrandPublic[] | null)?.forEach((b) => brands.set(b.brand_id, b));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Your deals</h1>
      {deals.length === 0 ? (
        <p className="text-muted-foreground">
          No deals yet. Make sure you&apos;re accepting deals on your{" "}
          <Link href="/dashboard" className="underline">
            dashboard
          </Link>
          .
        </p>
      ) : (
        deals.map((deal) => {
          const brand = brands.get(deal.brand_id);
          const canRespond = deal.status === "sent" || deal.status === "viewed";
          return (
            <Card key={deal.id}>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {brand?.logo_url ? (
                    <Image
                      src={brand.logo_url}
                      alt={brand.company_name ?? ""}
                      width={40}
                      height={40}
                      unoptimized
                      className="size-10 rounded-md border object-cover"
                    />
                  ) : (
                    <div className="size-10 rounded-md bg-muted" />
                  )}
                  <CardTitle className="text-base">
                    {brand?.company_name ?? "A brand"}
                  </CardTitle>
                </div>
                <StatusBadge status={deal.status} />
              </CardHeader>
              <CardContent className="space-y-4">
                <DealMeta deal={deal} />
                {canRespond && <DealResponseButtons dealId={deal.id} />}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

async function BrandSent({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("deals")
    .select("*")
    .eq("brand_id", userId)
    .order("created_at", { ascending: false });
  const deals = (data as Deal[]) ?? [];

  const artistIds = [...new Set(deals.map((d) => d.artist_id))];
  const artists = new Map<string, ArtistPublicStats>();
  if (artistIds.length) {
    const { data: ap } = await supabase
      .from("artist_public_stats")
      .select("*")
      .in("artist_id", artistIds);
    (ap as ArtistPublicStats[] | null)?.forEach((a) =>
      artists.set(a.artist_id, a)
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Sent deals</h1>
        <Button asChild>
          <Link href="/discover">Discover artists</Link>
        </Button>
      </div>
      {deals.length === 0 ? (
        <p className="text-muted-foreground">
          You haven&apos;t sent any deals yet.
        </p>
      ) : (
        deals.map((deal) => {
          const artist = artists.get(deal.artist_id);
          return (
            <Card key={deal.id}>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {artist?.profile_picture_url ? (
                    <Image
                      src={artist.profile_picture_url}
                      alt={artist.username ?? ""}
                      width={40}
                      height={40}
                      unoptimized
                      className="size-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-10 rounded-full bg-muted" />
                  )}
                  <CardTitle className="text-base">
                    {artist
                      ? artist.display_name ?? `@${artist.username}`
                      : "Artist"}
                  </CardTitle>
                </div>
                <StatusBadge status={deal.status} />
              </CardHeader>
              <CardContent>
                <DealMeta deal={deal} />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
