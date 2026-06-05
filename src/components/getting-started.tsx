import Link from "next/link";
import { Check, ArrowRight, PartyPopper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GettingStartedStep = {
  title: string;
  description: string;
  done: boolean;
  cta?: { label: string; href: string };
};

/**
 * Airbnb-style guided onboarding checklist. Shows progress, checks off
 * completed steps, and surfaces a single primary action for the next
 * incomplete step. Collapses into a celebratory state once everything's done.
 */
export function GettingStarted({
  steps,
  allDoneTitle,
  allDoneBody,
}: {
  steps: GettingStartedStep[];
  allDoneTitle: string;
  allDoneBody: string;
}) {
  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = Math.round((completed / total) * 100);
  const nextIndex = steps.findIndex((s) => !s.done);

  if (completed === total) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-soft">
        <CardContent className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <PartyPopper className="size-6" />
          </div>
          <div>
            <div className="font-semibold text-navy">{allDoneTitle}</div>
            <p className="text-sm text-muted-foreground">{allDoneBody}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow/40 bg-yellow/5 shadow-soft">
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-navy">
              Get set up
            </h2>
            <span className="text-sm font-medium text-muted-foreground">
              {completed} of {total} done
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-navy transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <ol className="space-y-3">
          {steps.map((step, i) => {
            const isNext = i === nextIndex;
            return (
              <li
                key={step.title}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                  step.done
                    ? "border-transparent bg-transparent"
                    : isNext
                      ? "border-yellow bg-white shadow-soft"
                      : "border-transparent bg-transparent opacity-70"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    step.done
                      ? "bg-emerald-600 text-white"
                      : isNext
                        ? "bg-navy text-yellow"
                        : "bg-secondary text-muted-foreground"
                  )}
                >
                  {step.done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "font-medium",
                      step.done
                        ? "text-muted-foreground line-through"
                        : "text-navy"
                    )}
                  >
                    {step.title}
                  </div>
                  {!step.done && (
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>
                {isNext && step.cta && (
                  <Button asChild variant="accent" size="sm">
                    <Link href={step.cta.href}>
                      {step.cta.label} <ArrowRight />
                    </Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
