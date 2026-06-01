import { Suspense } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-xl font-semibold"
      >
        <Sparkles className="size-5" /> Muabox
      </Link>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
