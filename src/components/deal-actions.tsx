"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { respondToDeal, completeDeal } from "@/app/(app)/deals/actions";
import type { DealStatus, UserRole } from "@/lib/types";

export function DealActions({
  dealId,
  role,
  status,
  initiatedBy = "brand",
}: {
  dealId: string;
  role: UserRole;
  status: DealStatus;
  initiatedBy?: UserRole;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>, msg: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(msg);
        router.refresh();
      } catch {
        toast.error("Couldn't update the deal.");
      }
    });
  }

  // Only the RECEIVER responds: artist for brand offers, brand for pitches.
  const isReceiver =
    (initiatedBy === "brand" && role === "artist") ||
    (initiatedBy === "artist" && role === "brand");
  const canRespond = isReceiver && (status === "sent" || status === "viewed");
  const canComplete = status === "accepted";

  if (!canRespond && !canComplete) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {canRespond && (
        <>
          <Button
            variant="accent"
            disabled={pending}
            onClick={() =>
              run(
                () => respondToDeal(dealId, "accepted"),
                initiatedBy === "artist" ? "Pitch accepted 🎉" : "Deal accepted 🎉"
              )
            }
          >
            <Check /> Accept
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(() => respondToDeal(dealId, "declined"), "Deal declined")
            }
          >
            <X /> Decline
          </Button>
        </>
      )}
      {canComplete && (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => completeDeal(dealId), "Marked completed")}
        >
          <CheckCheck /> Mark completed
        </Button>
      )}
    </div>
  );
}
