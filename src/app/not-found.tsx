import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <Link
        href="/"
        className="flex items-center gap-2 text-lg font-bold text-navy"
      >
        <span className="flex size-8 items-center justify-center rounded-xl bg-navy text-yellow">
          <Sparkles className="size-4" />
        </span>
        Muabox
      </Link>
      <div className="mt-4 text-6xl font-bold text-navy">404</div>
      <p className="max-w-md text-muted-foreground">
        We couldn&apos;t find that page. It may have moved, or the artist may no
        longer be accepting deals.
      </p>
      <Button asChild variant="accent">
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
