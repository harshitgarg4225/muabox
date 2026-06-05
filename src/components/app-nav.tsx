"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  LogOut,
  LayoutDashboard,
  Compass,
  Inbox,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/types";

type NavLink = { href: string; label: string; icon: LucideIcon; badge: number };

export function AppNav({
  role,
  name,
  dealsUnread = 0,
  isAdmin = false,
}: {
  role: UserRole;
  name: string | null;
  dealsUnread?: number;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const isArtist = role === "artist";

  const links: NavLink[] = isArtist
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badge: 0 },
        { href: "/deals", label: "Deals", icon: Inbox, badge: dealsUnread },
        { href: "/settings", label: "Profile", icon: UserRound, badge: 0 },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badge: 0 },
        { href: "/discover", label: "Discover", icon: Compass, badge: 0 },
        { href: "/deals", label: "Deals", icon: Inbox, badge: dealsUnread },
        { href: "/settings", label: "Profile", icon: UserRound, badge: 0 },
      ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2 font-bold text-navy"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-navy text-yellow">
              <Sparkles className="size-4" />
            </span>
            <span>Muabox</span>
          </Link>

          {/* Desktop pill nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(l.href)
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
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "hidden rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:inline-block",
                  pathname.startsWith("/admin")
                    ? "bg-navy text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-navy"
                )}
              >
                Admin
              </Link>
            )}
            <span className="hidden max-w-[10rem] truncate text-sm font-medium text-navy sm:inline">
              {name ?? (isArtist ? "Artist" : "Brand")}
            </span>
            <form action="/auth/signout" method="post">
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut />
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {links.map((l) => {
            const active = isActive(l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-navy" : "text-muted-foreground"
                )}
              >
                <span className="relative">
                  <Icon className={cn("size-5", active && "text-navy")} />
                  {l.badge > 0 && (
                    <span className="absolute -right-2 -top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-yellow px-1 text-[10px] font-bold text-navy">
                      {l.badge}
                    </span>
                  )}
                </span>
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
