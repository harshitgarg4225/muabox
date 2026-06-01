"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { respondToDeal } from "@/app/(app)/deals/actions";

export function DealResponseButtons({ dealId }: { dealId: string }) {
  const [pending, startTransition] = useTransition();

  function respond(status: "accepted" | "declined") {
    startTransition(async () => {
      try {
        await respondToDeal(dealId, status);
        toast.success(status === "accepted" ? "Deal accepted." : "Deal declined.");
      } catch {
        toast.error("Could not update the deal.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => respond("accepted")}
      >
        <Check /> Accept
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => respond("declined")}
      >
        <X /> Decline
      </Button>
    </div>
  );
}
