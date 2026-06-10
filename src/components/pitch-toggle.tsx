"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setOpenToPitches } from "@/app/(app)/settings/actions";

export function PitchToggle({ initial }: { initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  const [pending, start] = useTransition();

  function onChange(value: boolean) {
    setChecked(value); // optimistic
    start(async () => {
      try {
        await setOpenToPitches(value);
        toast.success(
          value ? "Artists can now pitch you." : "Pitches paused."
        );
      } catch {
        setChecked(!value);
        toast.error("Couldn't update the setting.");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <Label htmlFor="open-pitches" className="text-base">
          Open to artist pitches
        </Label>
        <p className="text-sm text-muted-foreground">
          When on, luxury artists can send you collaboration pitches directly.
        </p>
      </div>
      <Switch
        id="open-pitches"
        checked={checked}
        disabled={pending}
        onCheckedChange={onChange}
      />
    </div>
  );
}
