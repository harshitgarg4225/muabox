"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setSuspended, setAdmin } from "@/app/admin/actions";

export function AdminUserActions({
  userId,
  suspended,
  isAdmin,
  isSelf,
}: {
  userId: string;
  suspended: boolean;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<void>, msg: string) {
    start(async () => {
      try {
        await fn();
        toast.success(msg);
        router.refresh();
      } catch {
        toast.error("Action failed.");
      }
    });
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        size="sm"
        variant={suspended ? "outline" : "destructive"}
        disabled={pending || isSelf}
        title={isSelf ? "You can't suspend yourself" : undefined}
        onClick={() =>
          run(
            () => setSuspended(userId, !suspended),
            suspended ? "User reinstated" : "User suspended"
          )
        }
      >
        {suspended ? "Reinstate" : "Suspend"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending || isSelf}
        title={isSelf ? "You can't change your own admin role" : undefined}
        onClick={() =>
          run(
            () => setAdmin(userId, !isAdmin),
            isAdmin ? "Admin removed" : "Admin granted"
          )
        }
      >
        {isAdmin ? "Remove admin" : "Make admin"}
      </Button>
    </div>
  );
}
