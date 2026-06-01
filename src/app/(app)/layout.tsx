import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (!profile) redirect("/onboarding");

  const isArtist = profile.role === "artist";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <Sparkles className="size-5" /> Muabox
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            {isArtist ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/settings">Profile</Link>
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link href="/discover">Discover</Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href="/deals">Deals</Link>
            </Button>
            {!isArtist && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/settings">Profile</Link>
              </Button>
            )}
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
