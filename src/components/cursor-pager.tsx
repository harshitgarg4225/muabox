import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Forward cursor pager. Builds links that preserve existing query params and
 * set/clear the `before` cursor. Scalable: each page is a bounded query.
 */
export function CursorPager({
  basePath,
  params,
  nextCursor,
  hasCursor,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  nextCursor: string | null;
  hasCursor: boolean;
}) {
  function href(extra: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...extra })) {
      if (v) sp.set(k, v);
    }
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  if (!nextCursor && !hasCursor) return null;

  return (
    <div className="flex items-center justify-between pt-2">
      {hasCursor ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={href({ before: undefined })}>
            <RotateCcw /> First page
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {nextCursor ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href({ before: nextCursor })}>
            Older <ArrowRight />
          </Link>
        </Button>
      ) : (
        <span className="text-sm text-muted-foreground">End of results</span>
      )}
    </div>
  );
}
