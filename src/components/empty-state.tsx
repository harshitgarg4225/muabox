import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Warm, actionable empty state — never leave a new user staring at a dead end. */
export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-secondary/40 px-6 py-12 text-center">
      <span className="text-4xl">{emoji}</span>
      <h3 className="text-lg font-semibold text-navy">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      {action && (
        <Button asChild variant="accent" className="mt-1">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
