import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (!profile) redirect("/onboarding");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav role={profile.role} name={profile.full_name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
