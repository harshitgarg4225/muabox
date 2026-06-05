import Link from "next/link";
import { redirect } from "next/navigation";
import { Palette, Building2 } from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { selectRole } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/lib/types";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (profile) redirect("/dashboard");

  const { role } = await searchParams;
  const preselected = role === "artist" || role === "brand" ? role : null;

  // The user already picked a role on the landing page — don't re-ask.
  if (preselected) {
    const other = preselected === "artist" ? "brand" : "artist";
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-navy">
              You&apos;re almost in
            </h1>
            <p className="text-muted-foreground">
              Just one detail to set up your{" "}
              {preselected === "artist" ? "artist" : "brand"} account.
            </p>
          </div>

          {preselected === "artist" ? (
            <RoleCard
              role="artist"
              icon={<Palette className="size-6" />}
              title="Artist account"
              description="Connect Instagram, show your stats, and receive PR collab deals from brands."
              highlight
            />
          ) : (
            <RoleCard
              role="brand"
              icon={<Building2 className="size-6" />}
              title="Brand account"
              description="Browse consented makeup artists and send them PR collaboration offers."
              highlight
            />
          )}

          <p className="text-center text-sm text-muted-foreground">
            Not a {preselected}?{" "}
            <Link href={`/onboarding?role=${other}`} className="font-medium text-navy underline">
              I&apos;m a {other}
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-navy">Welcome to Muabox</h1>
          <p className="text-muted-foreground">
            Tell us who you are so we can set up your account.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <RoleCard
            role="artist"
            icon={<Palette className="size-6" />}
            title="I'm an artist"
            description="Connect Instagram, show your stats, and receive PR collab deals from brands."
            highlight={false}
          />
          <RoleCard
            role="brand"
            icon={<Building2 className="size-6" />}
            title="I'm a brand"
            description="Browse consented makeup artists and send them PR collaboration offers."
            highlight={false}
          />
        </div>
      </div>
    </main>
  );
}

function RoleCard({
  role,
  icon,
  title,
  description,
  highlight,
}: {
  role: UserRole;
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight: boolean;
}) {
  return (
    <Card
      className={`shadow-soft transition-shadow hover:shadow-lift ${
        highlight ? "ring-2 ring-yellow" : ""
      }`}
    >
      <CardHeader>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-navy text-yellow">
          {icon}
        </div>
        <CardTitle className="text-navy">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={selectRole} className="space-y-3">
          <input type="hidden" name="role" value={role} />
          <div className="space-y-2">
            <Label htmlFor={`name-${role}`}>
              {role === "artist" ? "Display name" : "Company name"}
            </Label>
            <Input
              id={`name-${role}`}
              name="full_name"
              placeholder={role === "artist" ? "Your name" : "Your company"}
            />
          </div>
          <Button type="submit" variant="accent" className="w-full">
            Continue as {role}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
