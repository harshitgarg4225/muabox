import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/types";
import type { RateCardItem } from "@/lib/pricing";

export function RateCardDisplay({
  collabTypes,
  rateCard,
  minBudget,
  currency = "INR",
}: {
  collabTypes: string[];
  rateCard: RateCardItem[];
  minBudget: number | null;
  currency?: string;
}) {
  const hasAnything =
    (collabTypes?.length ?? 0) > 0 ||
    (rateCard?.length ?? 0) > 0 ||
    minBudget != null;
  if (!hasAnything) return null;

  return (
    <div className="space-y-3">
      {collabTypes?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {collabTypes.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
      )}

      {rateCard?.length > 0 && (
        <div className="divide-y rounded-xl border">
          {rateCard.map((r) => (
            <div
              key={r.deliverable}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <span className="text-foreground">{r.deliverable}</span>
              <span className="font-medium text-navy">
                {r.price != null ? formatMoney(r.price, currency) : "On request"}
              </span>
            </div>
          ))}
        </div>
      )}

      {minBudget != null && (
        <p className="text-sm text-muted-foreground">
          Minimum budget:{" "}
          <span className="font-medium text-navy">
            {formatMoney(minBudget, currency)}
          </span>
        </p>
      )}
    </div>
  );
}
