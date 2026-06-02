import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import type { Deal } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (!profile) redirect("/onboarding");

  const isArtist = profile.role === "artist";

  // Unread deals = latest activity from the other party, after my read marker.
  const supabase = await createClient();
  const { data: dealRows } = await supabase
    .from("deals")
    .select(
      "last_message_at, last_message_sender_id, brand_read_at, artist_read_at"
    )
    .eq(isArtist ? "artist_id" : "brand_id", user.id);

  const dealsUnread = ((dealRows as Partial<Deal>[] | null) ?? []).filter(
    (d) => {
      const myReadAt = isArtist ? d.artist_read_at : d.brand_read_at;
      return (
        !!d.last_message_sender_id &&
        d.last_message_sender_id !== user.id &&
        (!myReadAt || (d.last_message_at ?? "") > myReadAt)
      );
    }
  ).length;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav
        role={profile.role}
        name={profile.full_name}
        dealsUnread={dealsUnread}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6 sm:pb-8">
        {children}
      </main>
    </div>
  );
}
