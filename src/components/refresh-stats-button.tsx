"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RefreshStatsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/instagram/refresh", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.error === "revoked") {
          toast.error("Instagram access was revoked. Please reconnect.");
        } else {
          toast.error("Couldn't refresh stats. Try again later.");
        }
      } else {
        toast.success("Stats refreshed.");
        router.refresh();
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
      <RefreshCw className={loading ? "animate-spin" : undefined} />
      Refresh stats
    </Button>
  );
}
