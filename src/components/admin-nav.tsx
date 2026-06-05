"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/deals", label: "Deals" },
  { href: "/admin/payments", label: "Payments" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 font-bold text-navy">
            <span className="flex size-8 items-center justify-center rounded-xl bg-navy text-yellow">
              <Sparkles className="size-4" />
            </span>
            Admin
          </span>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const active =
                t.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-navy text-white"
                      : "text-muted-foreground hover:bg-secondary hover:text-navy"
                  )}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">
            <ArrowLeft /> Back to app
          </Link>
        </Button>
      </div>
    </header>
  );
}
