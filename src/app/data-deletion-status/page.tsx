import Link from "next/link";
import { Sparkles, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Data Deletion Status — Muabox",
};

export default async function DataDeletionStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

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
        <CheckCircle2 className="size-12 text-green-600" />
        <h1 className="text-2xl font-bold">Data deletion processed</h1>
        <p className="text-muted-foreground">
          {id ? (
            <>
              Your Instagram data associated with request{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">{id}</code> has
              been deleted from Muabox.
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
