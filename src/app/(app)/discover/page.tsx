import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney, type ArtistPublicStats } from "@/lib/types";

export const dynamic = "force-dynamic";

function compact(n: number | null) {
  if (n == null) return "—";
  return Intl.NumberFormat("en-US", { notation: "compact" }).format(n);
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    location?: string;
    min_followers?: string;
    pricing?: string;
  }>;
}) {
  const { profile } = await getUserAndProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "brand") redirect("/dashboard");

  const { location, min_followers, pricing } = await searchParams;

  const supabase = await createClient();
  let query = supabase
    .from("artist_public_stats")
    .select("*")
    .order("followers_count", { ascending: false, nullsFirst: false });

  if (location) query = query.ilike("location", `%${location}%`);
  if (min_followers && Number(min_followers) > 0) {
    query = query.gte("followers_count", Number(min_followers));
  }
  if (pricing === "fixed" || pricing === "custom") {
    query = query.eq("pricing", pricing);
  }

  const { data } = await query;
  const artists = (data as ArtistPublicStats[]) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Discover artists</h1>

      <form className="grid gap-3 rounded-lg border p-4 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            defaultValue={location}
            placeholder="Any"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="min_followers">Min followers</Label>
          <Input
            id="min_followers"
            name="min_followers"
            type="number"
            min={0}
            defaultValue={min_followers}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pricing">Pricing</Label>
          <select
            id="pricing"
            name="pricing"
            defaultValue={pricing ?? ""}
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs"
          >
            <option value="">Any</option>
            <option value="fixed">Fixed</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" className="flex-1">
            Filter
          </Button>
          <Button asChild variant="outline">
            <Link href="/discover">Reset</Link>
          </Button>
        </div>
      </form>

      {artists.length === 0 ? (
        <p className="text-muted-foreground">
          No artists match your filters yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((a) => (
            <Link key={a.artist_id} href={`/artists/${a.artist_id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="flex-row items-center gap-3">
                  {a.profile_picture_url ? (
                    <Image
                      src={a.profile_picture_url}
                      alt={a.username ?? ""}
                      width={48}
                      height={48}
                      unoptimized
                      className="size-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-12 rounded-full bg-muted" />
                  )}
                  <div className="min-w-0">
                    <CardTitle className="truncate">
                      {a.display_name ?? a.username}
                    </CardTitle>
                    <p className="truncate text-sm text-muted-foreground">
                      @{a.username}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      <strong>{compact(a.followers_count)}</strong> followers
                    </span>
                  </div>
                  {a.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" /> {a.location}
                    </div>
                  )}
                  <div>
                    {a.pricing === "fixed" && a.price_min != null ? (
                      <Badge variant="secondary">
                        {formatMoney(a.price_min, a.currency)}
                        {a.price_max != null
                          ? ` – ${formatMoney(a.price_max, a.currency)}`
                          : "+"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Contact for pricing</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
