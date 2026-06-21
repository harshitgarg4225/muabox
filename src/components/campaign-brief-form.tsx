"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { updateCampaignBrief } from "@/app/(app)/campaigns/actions";

export function CampaignBriefForm({
  campaignId,
  requiredHashtags,
  requiredMentions,
  dos,
  donts,
  disclosureRequired,
}: {
  campaignId: string;
  requiredHashtags: string[];
  requiredMentions: string[];
  dos: string | null;
  donts: string | null;
  disclosureRequired: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({
    hashtags: requiredHashtags.join(", "),
    mentions: requiredMentions.join(", "),
    dos: dos ?? "",
    donts: donts ?? "",
    disclosure: disclosureRequired,
  });

  const isEmpty =
    requiredHashtags.length === 0 &&
    requiredMentions.length === 0 &&
    !dos &&
    !donts;

  async function save() {
    setBusy(true);
    const res = await updateCampaignBrief({
      campaignId,
      dos: v.dos,
      donts: v.donts,
      requiredHashtags: v.hashtags,
      requiredMentions: v.mentions,
      disclosureRequired: v.disclosure,
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Brief updated.");
      setEditing(false);
      router.refresh();
    } else {
      toast.error("Could not save the brief.");
    }
  }

  if (!editing) {
    return (
      <div className="space-y-3 text-sm">
        {isEmpty && !disclosureRequired ? (
          <p className="text-muted-foreground">
            No creative brief yet. Add required hashtags, mentions and do&apos;s
            &amp; don&apos;ts so every artist&apos;s content stays on-message.
          </p>
        ) : (
          <>
            {(requiredHashtags.length > 0 || requiredMentions.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {requiredHashtags.map((h) => (
                  <Badge key={h} variant="secondary">
                    {h}
                  </Badge>
                ))}
                {requiredMentions.map((m) => (
                  <Badge key={m} variant="outline">
                    {m}
                  </Badge>
                ))}
              </div>
            )}
            {dos && (
              <div>
                <span className="font-medium text-emerald-700">Do: </span>
                <span className="text-muted-foreground">{dos}</span>
              </div>
            )}
            {donts && (
              <div>
                <span className="font-medium text-destructive">Don&apos;t: </span>
                <span className="text-muted-foreground">{donts}</span>
              </div>
            )}
            {disclosureRequired && (
              <p className="inline-flex items-center gap-1 text-muted-foreground">
                <ShieldCheck className="size-4" /> ASCI #ad disclosure required
              </p>
            )}
          </>
        )}
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          <Pencil /> {isEmpty && !disclosureRequired ? "Add brief" : "Edit brief"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Required hashtags</Label>
          <Input
            value={v.hashtags}
            onChange={(e) => setV({ ...v, hashtags: e.target.value })}
            placeholder="#GlowSerum, #ad"
          />
        </div>
        <div className="space-y-2">
          <Label>Tag these handles</Label>
          <Input
            value={v.mentions}
            onChange={(e) => setV({ ...v, mentions: e.target.value })}
            placeholder="@yourbrand"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Do&apos;s</Label>
        <Input value={v.dos} onChange={(e) => setV({ ...v, dos: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Don&apos;ts</Label>
        <Input value={v.donts} onChange={(e) => setV({ ...v, donts: e.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-sm text-navy">
        <input
          type="checkbox"
          checked={v.disclosure}
          onChange={(e) => setV({ ...v, disclosure: e.target.checked })}
          className="size-4 accent-[var(--navy)]"
        />
        Require ASCI #ad disclosure
      </label>
      <div className="flex gap-2">
        <Button size="sm" variant="accent" disabled={busy} onClick={save}>
          Save brief
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
