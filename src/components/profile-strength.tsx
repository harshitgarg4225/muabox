import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StrengthCheck = { label: string; done: boolean; href: string };

/**
 * Profile strength meter — shows artists exactly why they may not be getting
 * offers yet, and the next thing to fix.
 */
export function ProfileStrength({ checks }: { checks: StrengthCheck[] }) {
  const done = checks.filter((c) => c.done).length;
  const pct = Math.round((done / checks.length) * 100);
  if (pct === 100) return null; // nothing to nag about — stay out of the way

  const next = checks.find((c) => !c.done);

  return (
    <Card className="shadow-soft">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-navy">
            Profile strength
          </span>
          <span
            className={cn(
              "text-sm font-bold",
              pct >= 70 ? "text-emerald-700" : "text-amber-700"
            )}
          >
            {pct}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct >= 70 ? "bg-emerald-600" : "bg-yellow"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Complete profiles get noticed first.
          {next && (
            <>
              {" "}
              Next up:{" "}
              <Link href={next.href} className="font-medium text-navy underline">
                {next.label}
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
