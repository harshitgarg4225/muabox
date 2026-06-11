import Link from "next/link";
import { ArrowRight, BellRing } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type AttentionItem = {
  emoji: string;
  text: string;
  href: string;
  cta: string;
};

/** "Needs your attention" — the first thing a returning user should see. */
export function AttentionCard({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="border-navy/20 bg-navy/[0.03] shadow-soft">
      <CardContent className="space-y-1 py-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy">
          <BellRing className="size-4 text-yellow-600" /> Needs your attention
        </div>
        {items.map((item) => (
          <Link
            key={item.text}
            href={item.href}
            className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white"
          >
            <span className="flex items-center gap-2.5 text-sm text-foreground">
              <span aria-hidden>{item.emoji}</span>
              {item.text}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-navy group-hover:underline">
              {item.cta} <ArrowRight className="size-3.5" />
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
