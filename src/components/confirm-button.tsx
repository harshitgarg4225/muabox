"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Variant = "default" | "destructive" | "outline" | "accent";

/**
 * Generic "are you sure?" wrapper for irreversible actions. Runs the server
 * action on confirm, toasts, and refreshes.
 */
export function ConfirmButton({
  label,
  icon,
  variant = "outline",
  size = "sm",
  title,
  description,
  confirmLabel,
  confirmVariant = "destructive",
  successMessage,
  action,
}: {
  label: string;
  icon?: React.ReactNode;
  variant?: Variant;
  size?: "sm" | "default";
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: Variant;
  successMessage: string;
  action: () => Promise<unknown>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function confirm() {
    start(async () => {
      try {
        await action();
        toast.success(successMessage);
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          {icon}
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant={confirmVariant} onClick={confirm} disabled={pending}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
