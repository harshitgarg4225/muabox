"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setCampaignStatus } from "@/app/(app)/campaigns/actions";
import type { CampaignStatus } from "@/lib/types";

export function CampaignStatusButton({
  campaignId,
  status,
}: {
  campaignId: string;
  status: CampaignStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = status === "active" ? "closed" : "active";

  function toggle() {
    start(async () => {
      try {
        await setCampaignStatus(campaignId, next);
        toast.success(next === "closed" ? "Campaign closed." : "Campaign reopened.");
        router.refresh();
      } catch {
        toast.error("Couldn't update the campaign.");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={toggle}>
      {status === "active" ? "Close campaign" : "Reopen campaign"}
    </Button>
  );
}
