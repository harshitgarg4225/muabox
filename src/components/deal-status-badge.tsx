import { Badge } from "@/components/ui/badge";
import type { DealStatus } from "@/lib/types";

const STATUS_META: Record<
  DealStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  sent: { label: "New", variant: "secondary", className: "bg-yellow/20 text-yellow-600" },
  viewed: { label: "Viewed", variant: "outline" },
  accepted: { label: "Accepted", variant: "default", className: "bg-emerald-600 text-white" },
  declined: { label: "Declined", variant: "destructive" },
  completed: { label: "Completed", variant: "default", className: "bg-emerald-600 text-white" },
};

export function DealStatusBadge({ status }: { status: DealStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta.variant} className={meta.className}>
      {meta.label}
    </Badge>
  );
}
