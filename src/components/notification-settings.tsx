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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setEmailNotifications, setWhatsapp } from "@/app/(app)/settings/actions";

export function NotificationSettings({
  initial,
  whatsapp,
}: {
  initial: boolean;
  whatsapp: string | null;
}) {
  const [checked, setChecked] = useState(initial);
  const [phone, setPhone] = useState(whatsapp ?? "");
  const [savingPhone, setSavingPhone] = useState(false);
  const [pending, start] = useTransition();

  async function savePhone() {
    setSavingPhone(true);
    try {
      const res = await setWhatsapp(phone);
      if (res.ok) toast.success("WhatsApp number saved.");
      else toast.error("Enter a valid phone number (with country code).");
    } catch {
      toast.error("Couldn't save your number.");
    } finally {
      setSavingPhone(false);
    }
  }

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

        <div className="space-y-2 rounded-lg border p-4">
          <Label htmlFor="whatsapp" className="text-base">
            WhatsApp notifications (optional)
          </Label>
          <p className="text-sm text-muted-foreground">
            Get instant pings for new deals, acceptances and payments. Include
            your country code, e.g. +91 98765 43210.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              id="whatsapp"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="max-w-xs"
            />
            <Button
              type="button"
              variant="outline"
              onClick={savePhone}
              disabled={savingPhone}
            >
              Save number
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
