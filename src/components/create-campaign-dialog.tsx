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
import { createCampaign } from "@/app/(app)/campaigns/actions";
import { cn } from "@/lib/utils";

export function CreateCampaignDialog() {
  const [open, setOpen] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggle(s: string) {
    setSpecialties((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );
  }

  async function onSubmit(formData: FormData) {
    setSubmitting(true);
    formData.set("target_specialties", specialties.join(","));
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
              <Label htmlFor="product">Product / deliverables</Label>
              <Input
                id="product"
                name="product"
                placeholder="1 Reel + 2 Stories featuring the serum"
              />
            </div>
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
