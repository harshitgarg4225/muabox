import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SuspendedPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  // If they're not actually suspended, send them back into the app.
  if (profile && !profile.suspended) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <ShieldAlert className="size-12 text-destructive" />
      <h1 className="text-2xl font-bold text-navy">Your account is suspended</h1>
      <p className="max-w-md text-muted-foreground">
        Access to Muabox has been paused for this account. If you think this is a
        mistake, please contact{" "}
        <a href="mailto:support@muabox.app" className="underline">
          support@muabox.app
        </a>
        .
      </p>
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
      <Link href="/" className="text-sm underline">
        Back to home
      </Link>
    </main>
  );
}
