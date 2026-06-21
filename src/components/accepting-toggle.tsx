"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setAccepting } from "@/app/(app)/settings/actions";

export function AcceptingToggle({ initial }: { initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  const [pending, startTransition] = useTransition();

  function onChange(value: boolean) {
    const prev = checked;
    setChecked(value); // optimistic
    startTransition(async () => {
      try {
        const res = await setAccepting(value);
        if (!res.ok) {
          setChecked(prev); // revert to the real prior state, not blindly off
          toast.error(
            res.reason === "no_instagram"
              ? "Connect Instagram before accepting deals."
              : "Couldn't update — please try again."
          );
        } else {
          toast.success(value ? "You're now accepting deals." : "Deals paused.");
        }
      } catch {
        setChecked(prev);
        toast.error("Couldn't update — please try again.");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <Label htmlFor="accepting" className="text-base">
          Accepting deals
        </Label>
        <p className="text-sm text-muted-foreground">
          When on, brands can find you in Discover and send offers.
        </p>
      </div>
      <Switch
        id="accepting"
        checked={checked}
        disabled={pending}
        onCheckedChange={onChange}
      />
    </div>
  );
}
