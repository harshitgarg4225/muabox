"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setEmailNotifications } from "@/app/(app)/settings/actions";

export function NotificationSettings({ initial }: { initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  const [pending, start] = useTransition();

  function onChange(value: boolean) {
    setChecked(value);
    start(async () => {
      try {
        await setEmailNotifications(value);
        toast.success(value ? "Email notifications on." : "Email notifications off.");
      } catch {
        setChecked(!value);
        toast.error("Couldn't update preference.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-navy">Notifications</CardTitle>
        <CardDescription>
          Control the emails Muabox sends you about deals and messages.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div>
            <Label htmlFor="email-notifs" className="text-base">
              Email notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              New deals, replies, messages and payments.
            </p>
          </div>
          <Switch
            id="email-notifs"
            checked={checked}
            disabled={pending}
            onCheckedChange={onChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
