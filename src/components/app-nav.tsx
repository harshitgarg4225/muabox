"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/types";

export function AppNav({
  role,
  name,
  dealsUnread = 0,
}: {
  role: UserRole;
  name: string | null;
  dealsUnread?: number;
}) {
  const pathname = usePathname();
  const isArtist = role === "artist";

  const links = isArtist
    ? [
        { href: "/dashboard", label: "Dashboard", badge: 0 },
        { href: "/deals", label: "Deals", badge: dealsUnread },
        { href: "/settings", label: "Profile", badge: 0 },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", badge: 0 },
        { href: "/discover", label: "Discover", badge: 0 },
        { href: "/deals", label: "Deals", badge: dealsUnread },
        { href: "/settings", label: "Profile", badge: 0 },
      ];

  return (
    <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-navy"
        >
          <span className="flex size-8 items-center justify-center rounded-xl bg-navy text-yellow">
            <Sparkles className="size-4" />
          </span>
          <span className="hidden sm:inline">Muabox</span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active =
              pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-navy text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-navy"
                )}
              >
                {l.label}
                {l.badge > 0 && (
                  <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-yellow px-1.5 text-xs font-bold text-navy">
                    {l.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden max-w-[10rem] truncate text-sm font-medium text-navy sm:inline">
            {name ?? (isArtist ? "Artist" : "Brand")}
          </span>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="icon" title="Sign out">
              <LogOut />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
