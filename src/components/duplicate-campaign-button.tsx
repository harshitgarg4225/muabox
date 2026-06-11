"use client";

import { useTransition } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { duplicateCampaign } from "@/app/(app)/campaigns/actions";

export function DuplicateCampaignButton({ campaignId }: { campaignId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await duplicateCampaign(campaignId);
          // Redirects on success; only reaches here on failure.
          if (res && !res.ok) toast.error("Couldn't duplicate the campaign.");
        })
      }
    >
      <Copy /> Duplicate
    </Button>
  );
}
