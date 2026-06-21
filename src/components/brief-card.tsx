"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirmDisclosure } from "@/app/(app)/deals/execution-actions";
import type { UserRole } from "@/lib/types";

export type Brief = {
  required_hashtags: string[];
  required_mentions: string[];
  dos: string | null;
  donts: string | null;
  disclosure_required: boolean;
};

export function BriefCard({
  dealId,
  role,
  brief,
  disclosureConfirmedAt,
}: {
  dealId: string;
  role: UserRole;
  brief: Brief;
  disclosureConfirmedAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isArtist = role === "artist";

  async function confirm() {
    setBusy(true);
    const res = await confirmDisclosure(dealId);
    setBusy(false);
    if (res.ok) {
      toast.success("Thanks — disclosure confirmed.");
      router.refresh();
    } else {
      toast.error("Could not confirm.");
    }
  }

  return (
    <div className="space-y-4 text-sm">
      {(brief.required_hashtags.length > 0 ||
        brief.required_mentions.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {brief.required_hashtags.map((h) => (
            <Badge key={h} variant="secondary">
              {h}
            </Badge>
          ))}
          {brief.required_mentions.map((m) => (
            <Badge key={m} variant="outline">
              {m}
            </Badge>
          ))}
        </div>
      )}

      {brief.dos && (
        <div>
          <span className="font-medium text-emerald-700">Do: </span>
          <span className="text-muted-foreground">{brief.dos}</span>
        </div>
      )}
      {brief.donts && (
        <div>
          <span className="font-medium text-destructive">Don&apos;t: </span>
          <span className="text-muted-foreground">{brief.donts}</span>
        </div>
      )}

      {brief.disclosure_required && (
        <div className="rounded-xl border bg-secondary/40 p-3">
          <div className="flex items-center gap-2 font-medium text-navy">
            <ShieldCheck className="size-4" /> Disclosure required (ASCI)
          </div>
          <p className="mt-1 text-muted-foreground">
            This is a paid partnership — the post must clearly tag{" "}
            <strong>#ad</strong> or <strong>#sponsored</strong> per India&apos;s
            ASCI guidelines.
          </p>
          {disclosureConfirmedAt ? (
            <p className="mt-2 inline-flex items-center gap-1 font-medium text-emerald-700">
              <Check className="size-4" />{" "}
              {isArtist ? "You confirmed you'll disclose." : "Artist confirmed disclosure."}
            </p>
          ) : isArtist ? (
            <Button
              size="sm"
              variant="accent"
              className="mt-2"
              disabled={busy}
              onClick={confirm}
            >
              I&apos;ll disclose with #ad
            </Button>
          ) : (
            <p className="mt-2 text-muted-foreground">
              Waiting for the artist to confirm disclosure.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
