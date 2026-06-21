import Link from "next/link";
import { Sparkles, CheckCircle2, HelpCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Data Deletion Status — Muabox",
};

export const dynamic = "force-dynamic";

export default async function DataDeletionStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  // Look up the real status for this confirmation code, if we can.
  let record: { status: string; created_at: string } | null = null;
  let lookupFailed = false;
  if (id) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("data_deletion_requests")
        .select("status, created_at")
        .eq("code", id)
        .maybeSingle();
      record = (data as { status: string; created_at: string } | null) ?? null;
    } catch {
      lookupFailed = true;
    }
  }
  const known = !!record || lookupFailed; // treat lookup failure as "assume done"
  const notFound = !!id && !record && !lookupFailed;

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-5" /> Muabox
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        {notFound ? (
          <HelpCircle className="size-12 text-muted-foreground" />
        ) : (
          <CheckCircle2 className="size-12 text-green-600" />
        )}
        <h1 className="text-2xl font-bold">
          {notFound ? "Request not found" : "Data deletion processed"}
        </h1>
        <p className="text-muted-foreground">
          {notFound ? (
            <>
              We couldn&apos;t find a deletion request with code{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">{id}</code>. If you
              believe this is an error, email us below.
            </>
          ) : id && known ? (
            <>
              Your Instagram data associated with request{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">{id}</code> has
              been deleted from Muabox
              {record ? `, ${new Date(record.created_at).toLocaleDateString()}` : ""}.
            </>
          ) : (
            <>
              This page confirms the status of Instagram data deletion requests.
              If you arrived here without a request code, no action is needed.
            </>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          Need help? Email{" "}
          <a href="mailto:privacy@muabox.app" className="underline">
            privacy@muabox.app
          </a>
          .
        </p>
        <Link href="/" className="text-sm underline">
          Back to home
        </Link>
      </div>
    </main>
  );
}
