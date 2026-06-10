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
import type { BrandPublic, Deal, DealStatus } from "@/lib/types";

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
          body="Skincare brands are onboarding now. Keep your profile sharp and accepting deals — you'll be visible the moment they browse."
          action={{ label: "Polish my profile", href: "/settings" }}
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
