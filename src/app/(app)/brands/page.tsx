import Image from "next/image";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { PitchDialog } from "@/components/pitch-dialog";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { StarRating } from "@/components/star-rating";
import type { BrandPublic, Deal, DealStatus, Rating } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || !profile) redirect("/login");
  if (profile.role !== "artist") redirect("/dashboard");

  const supabase = await createClient();

  const { data: brandRows } = await supabase
    .from("brand_public")
    .select("*")
    .order("company_name", { ascending: true, nullsFirst: false });
  const brands = ((brandRows as BrandPublic[]) ?? []).filter(
    (b) => b.company_name // only brands that completed their profile
  );

  // The artist's open pitches per brand, so we never let them double-pitch.
  const { data: pitchRows } = await supabase
    .from("deals")
    .select("brand_id, status")
    .eq("artist_id", user.id)
    .eq("initiated_by", "artist");
  const pitchStatus = new Map<string, DealStatus>();
  ((pitchRows as Pick<Deal, "brand_id" | "status">[]) ?? []).forEach((p) => {
    const cur = pitchStatus.get(p.brand_id);
    // Prefer showing an open pitch over an old resolved one.
    if (!cur || p.status === "sent" || p.status === "viewed") {
      pitchStatus.set(p.brand_id, p.status);
    }
  });

  // Brand reputation — so artists can vet who they pitch (symmetry with the
  // ratings brands see on artists).
  const ratingByBrand = new Map<string, Rating>();
  const brandIds = brands.map((b) => b.brand_id);
  if (brandIds.length) {
    const { data: ratingRows } = await supabase
      .from("brand_ratings")
      .select("brand_id, avg_rating, review_count")
      .in("brand_id", brandIds);
    (ratingRows as (Rating & { brand_id: string })[] | null)?.forEach((r) =>
      ratingByBrand.set(r.brand_id, r)
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Brands on Muabox</h1>
        <p className="text-sm text-muted-foreground">
          {brands.length} {brands.length === 1 ? "brand" : "brands"} looking for
          luxury artists. Pitch the ones that fit your craft.
        </p>
      </div>

      {brands.length === 0 ? (
        <EmptyState
          emoji="🏷️"
          title="Brands are arriving"
          body="Skincare brands are onboarding now. Keep your profile sharp and accepting deals — you'll be visible the moment they browse. Worked with a brand you loved? Invite them."
          action={{ label: "Polish my profile", href: "/settings" }}
          secondary={{
            label: "Invite a brand",
            href: `mailto:?subject=${encodeURIComponent(
              "Find luxury makeup artists on Muabox"
            )}&body=${encodeURIComponent(
              "Hi! I'm on Muabox — a marketplace where skincare brands run budgeted PR campaigns with luxury makeup artists. You can browse artists, see real Instagram stats, and pay securely. Join here: " +
                (process.env.NEXT_PUBLIC_APP_URL ?? "https://muabox.vercel.app") +
                "/login?role=brand"
            )}`,
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {brands.map((b) => {
            const status = pitchStatus.get(b.brand_id);
            const openPitch = status === "sent" || status === "viewed";
            return (
              <Card key={b.brand_id} className="shadow-soft">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {b.logo_url ? (
                        <Image
                          src={b.logo_url}
                          alt={b.company_name ?? ""}
                          width={48}
                          height={48}
                          unoptimized
                          className="size-12 rounded-xl border object-cover"
                        />
                      ) : (
                        <div className="size-12 rounded-xl bg-muted" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-navy">
                          {b.company_name}
                        </div>
                        {(() => {
                          const r = ratingByBrand.get(b.brand_id);
                          return r && r.review_count > 0 ? (
                            <StarRating
                              value={r.avg_rating}
                              count={r.review_count}
                              className="mt-0.5"
                            />
                          ) : null;
                        })()}
                        {b.website && (
                          <a
                            href={b.website}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 truncate text-xs text-muted-foreground hover:underline"
                          >
                            {b.website.replace(/^https?:\/\//, "")}{" "}
                            <ExternalLink className="size-3 shrink-0" />
                          </a>
                        )}
                      </div>
                    </div>
                    {openPitch ? (
                      <DealStatusBadge status={status!} />
                    ) : b.open_to_pitches ? (
                      <PitchDialog
                        brandId={b.brand_id}
                        brandName={b.company_name ?? "this brand"}
                      />
                    ) : (
                      <Badge variant="outline">Not accepting pitches</Badge>
                    )}
                  </div>
                  {b.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {b.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
