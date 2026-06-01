"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <span className="text-5xl">😵‍💫</span>
      <h1 className="text-2xl font-bold text-navy">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        We hit an unexpected error. Try again, or head back home.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="accent">
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
