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
    setChecked(value); // optimistic
    startTransition(async () => {
      const res = await setAccepting(value);
      if (!res.ok) {
        setChecked(false);
        toast.error("Connect Instagram before accepting deals.");
      } else {
        toast.success(value ? "You're now accepting deals." : "Deals paused.");
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
