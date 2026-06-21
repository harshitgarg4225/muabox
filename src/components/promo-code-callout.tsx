import { Ticket } from "lucide-react";
import { formatMoney, type PromoCode, type UserRole } from "@/lib/types";

/** Read-only promo-code summary shown on the deal page. Brands manage codes
 *  from the campaign page; here both sides just see the assigned code. */
export function PromoCodeCallout({
  promo,
  role,
}: {
  promo: PromoCode;
  role: UserRole;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-yellow/40 bg-yellow/10 p-4">
      <div className="flex items-center gap-3">
        <Ticket className="size-5 text-navy" />
        <div>
          <div className="font-mono text-lg font-bold tracking-wide text-navy">
            {promo.code}
          </div>
          <p className="text-sm text-muted-foreground">
            {promo.description ?? "Share this code with your audience"}
          </p>
        </div>
      </div>
      {role === "brand" && (
        <div className="text-right text-sm">
          <div className="font-semibold text-navy">
            {promo.redemptions} redemptions
          </div>
          <div className="text-muted-foreground">
            {formatMoney(promo.revenue, "INR")} attributed
          </div>
        </div>
      )}
    </div>
  );
}
