"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
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

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Couldn't update password. Open the latest reset link again.");
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
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>Choose a new password for your account.</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </CardContent>
          <CardFooter className="mt-4">
            <Button
              type="submit"
              variant="accent"
              className="w-full"
              disabled={loading}
            >
              Update password
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
