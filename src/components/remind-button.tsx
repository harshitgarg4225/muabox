"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { remindDeal } from "@/app/(app)/deals/actions";

const COOLDOWN_MS = 48 * 60 * 60 * 1000;

export function RemindButton({
  dealId,
  remindedAt,
}: {
  dealId: string;
  remindedAt: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Evaluated once on mount (lazy initializer keeps render pure).
  const [onCooldown, setOnCooldown] = useState(
    () =>
      !!remindedAt && Date.now() - new Date(remindedAt).getTime() < COOLDOWN_MS
  );

  function remind() {
    start(async () => {
      const res = await remindDeal(dealId);
      if (res.ok) {
        toast.success("Reminder sent.");
        setOnCooldown(true);
        router.refresh();
      } else if (res.reason === "cooldown") {
        setOnCooldown(true);
        toast.error("Already reminded recently — try again in a day or two.");
      } else {
        toast.error("Couldn't send the reminder.");
      }
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending || onCooldown}
      title={onCooldown ? "Reminded within the last 48h" : "Nudge the artist"}
      onClick={remind}
    >
      <BellRing /> {onCooldown ? "Reminded" : "Remind"}
    </Button>
  );
}
