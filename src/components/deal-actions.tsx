"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
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

  function accept() {
    startTransition(async () => {
      try {
        await respondToDeal(dealId, "accepted");
        toast.success(
          initiatedBy === "artist" ? "Pitch accepted 🎉" : "Deal accepted 🎉"
        );
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
  const thing = initiatedBy === "artist" ? "pitch" : "deal";

  if (!canRespond && !canComplete) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {canRespond && (
        <>
          <Button variant="accent" disabled={pending} onClick={accept}>
            <Check /> Accept
          </Button>
          <ConfirmButton
            label="Decline"
            icon={<X />}
            variant="outline"
            size="default"
            title={`Decline this ${thing}?`}
            description={`This can't be undone — the ${thing} will be closed and the other side notified. You can always work together on a future collaboration.`}
            confirmLabel="Yes, decline"
            successMessage={thing === "pitch" ? "Pitch declined" : "Deal declined"}
            action={() => respondToDeal(dealId, "declined")}
          />
        </>
      )}
      {canComplete && (
        <ConfirmButton
          label="Mark completed"
          icon={<CheckCheck />}
          variant="outline"
          size="default"
          title="Mark this collaboration complete?"
          description="Use this once the work is delivered. It closes out the deal — you'll both be able to leave a review."
          confirmLabel="Mark completed"
          confirmVariant="accent"
          successMessage="Marked completed"
          action={() => completeDeal(dealId)}
        />
      )}
    </div>
  );
}
