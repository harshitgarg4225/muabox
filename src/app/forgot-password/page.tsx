"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        "/auth/update-password"
      )}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
      setSent(true);
    } catch {
      // Don't reveal whether the email exists.
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-xl font-bold text-navy"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-navy text-yellow">
          <Sparkles className="size-5" />
        </span>
        Muabox
      </Link>

      <Card className="w-full max-w-sm shadow-soft">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            {sent
              ? "If an account exists for that email, we've sent a reset link."
              : "Enter your email and we'll send you a reset link."}
          </CardDescription>
        </CardHeader>
        {!sent ? (
          <form onSubmit={onSubmit}>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </CardContent>
            <CardFooter className="mt-4 flex-col gap-3">
              <Button
                type="submit"
                variant="accent"
                className="w-full"
                disabled={loading}
              >
                Send reset link
              </Button>
              <Link href="/login" className="text-sm text-muted-foreground hover:underline">
                Back to log in
              </Link>
            </CardFooter>
          </form>
        ) : (
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to log in</Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
