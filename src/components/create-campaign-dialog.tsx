"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SPECIALTIES } from "@/lib/specialties";
import { COMPENSATION_TYPES } from "@/lib/pricing";
import { createCampaign } from "@/app/(app)/campaigns/actions";
import { cn } from "@/lib/utils";

export function CreateCampaignDialog() {
  const [open, setOpen] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [comp, setComp] = useState("paid");
  const [submitting, setSubmitting] = useState(false);

  function toggle(s: string) {
    setSpecialties((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );
  }

  async function onSubmit(formData: FormData) {
    setSubmitting(true);
    formData.set("target_specialties", specialties.join(","));
    formData.set("compensation_type", comp);
    try {
      const res = await createCampaign(formData);
      // createCampaign redirects on success; reaching here means failure.
      if (res && !res.ok) toast.error("Couldn't create the campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent">
          <Plus /> New campaign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={onSubmit}>
          <DialogHeader>
            <DialogTitle>Create a campaign</DialogTitle>
            <DialogDescription>
              Set a budget and a brief, then invite artists at scale and track
              the ROI in one place.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign name</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Festive Glow Serum Launch"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">Deliverables you expect</Label>
              <Input
                id="product"
                name="product"
                placeholder="1 Reel + 2 Stories featuring the serum"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compensation_type">What you&apos;re offering</Label>
              <select
                id="compensation_type"
                value={comp}
                onChange={(e) => setComp(e.target.value)}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs"
              >
                {COMPENSATION_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer_description">Offer details</Label>
              <Input
                id="offer_description"
                name="offer_description"
                placeholder="e.g. ₹15,000 + full PR kit"
              />
            </div>
            {(comp === "gifted" || comp === "paid_product") && (
              <div className="space-y-2">
                <Label htmlFor="product_value">Product value (₹, optional)</Label>
                <Input
                  id="product_value"
                  name="product_value"
                  type="number"
                  min={0}
                  step="1"
                  placeholder="8000"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">Brief</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                placeholder="What is the campaign about — the vibe, the timeline…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Total budget (₹, optional)</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                min={0}
                step="1"
                placeholder="100000"
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll track committed and spent against this, and stop
                invites that would overshoot it.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Target specialties</Label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(s)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      specialties.includes(s)
                        ? "border-navy bg-navy text-white"
                        : "text-muted-foreground hover:border-navy hover:text-navy"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Creative brief — guides every artist's content. */}
            <div className="space-y-3 rounded-xl border bg-secondary/30 p-3">
              <p className="text-sm font-medium text-navy">
                Creative brief <span className="text-muted-foreground">(optional)</span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="required_hashtags">Required hashtags</Label>
                  <Input
                    id="required_hashtags"
                    name="required_hashtags"
                    placeholder="#GlowSerum, #ad"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="required_mentions">Tag these handles</Label>
                  <Input
                    id="required_mentions"
                    name="required_mentions"
                    placeholder="@yourbrand"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dos">Do&apos;s</Label>
                <Input id="dos" name="dos" placeholder="Show the texture, natural daylight" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="donts">Don&apos;ts</Label>
                <Input id="donts" name="donts" placeholder="No competitor products in frame" />
              </div>
              <label className="flex items-center gap-2 text-sm text-navy">
                <input
                  type="checkbox"
                  name="disclosure_required"
                  defaultChecked
                  className="size-4 accent-[var(--navy)]"
                />
                Require ASCI <strong>#ad</strong> disclosure (recommended)
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" variant="accent" disabled={submitting}>
              Create campaign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
