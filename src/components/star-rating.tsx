import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star display with optional rating value + count. */
export function StarRating({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const px = size === "md" ? "size-4" : "size-3.5";
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              px,
              i <= Math.round(value)
                ? "fill-yellow text-yellow"
                : "fill-muted text-muted"
            )}
          />
        ))}
      </span>
      <span className="text-sm font-medium text-navy">{value.toFixed(1)}</span>
      {count != null && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </span>
  );
}
