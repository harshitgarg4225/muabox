"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { BadgeCheck, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { savePayoutAccount } from "@/app/(app)/settings/actions";
import type { ArtistPayoutAccount } from "@/lib/types";

// Bounds mirror the server schema (settings/actions.ts) so over-long input is
// caught here with a clear field message instead of a generic server error.
const schema = z.object({
  legal_name: z.string().min(1, "Required").max(120, "Too long"),
  email: z.string().email(),
  phone: z
    .string()
    .min(8, "Enter a valid phone")
    .max(15, "Enter a valid phone"),
  business_type: z.string().default("individual"),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, "Invalid PAN")
    .or(z.literal(""))
    .optional(),
  account_number: z.string().min(5, "Required").max(30, "Too long"),
  ifsc: z.string().regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, "Invalid IFSC"),
  beneficiary_name: z.string().min(1, "Required").max(120, "Too long"),
  city: z.string().min(1, "Required").max(60, "Too long"),
  state: z.string().min(1, "Required").max(60, "Too long"),
  postal_code: z.string().min(4, "Required").max(10, "Too long"),
});

type FormValues = z.input<typeof schema>;

export function PayoutOnboardingForm({
  account,
  configured,
  feePercent,
}: {
  account: ArtistPayoutAccount | null;
  configured: boolean;
  feePercent: number;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      business_type: "individual",
      beneficiary_name: account?.beneficiary_name ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => v != null && fd.set(k, String(v)));
    const res = await savePayoutAccount(fd);
    if (res.ok) {
      toast.success("Payouts set up — you'll be paid automatically.");
    } else if (res.reason === "unavailable") {
      toast.error("Payouts aren't enabled on this environment yet.");
    } else if (res.reason === "missing_fields") {
      toast.error("Please fill in all required fields.");
    } else {
      toast.error(`Couldn't set up payouts: ${res.reason}`);
    }
  }

  const active = account?.status === "active";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-navy">Payouts</CardTitle>
        <CardDescription>
          Add your bank details so brand payments reach you automatically via
          Razorpay. We only store the last 4 digits — the rest goes straight to
          Razorpay. Muabox keeps a {feePercent}% platform fee per collaboration;
          the rest is transferred to you, automatically. No other charges, ever.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!configured && (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Payouts aren&apos;t enabled on this environment yet.
          </div>
        )}

        {account && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              active
                ? "bg-emerald-500/10 text-emerald-700"
                : account.status === "failed"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-yellow/15 text-amber-700"
            }`}
          >
            {active ? (
              <BadgeCheck className="size-4" />
            ) : account.status === "failed" ? (
              <AlertTriangle className="size-4" />
            ) : (
              <Clock className="size-4" />
            )}
            {active
              ? `Payouts active · bank ••••${account.bank_last4 ?? ""}`
              : account.status === "failed"
                ? "Last setup attempt failed — please re-check and resubmit."
                : "Payout setup pending."}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal name" error={errors.legal_name?.message}>
              <Input {...register("legal_name")} />
            </Field>
            <Field label="Beneficiary name (as per bank)" error={errors.beneficiary_name?.message}>
              <Input {...register("beneficiary_name")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="9876543210" />
            </Field>
            <Field label="PAN (optional)" error={errors.pan?.message}>
              <Input className="uppercase" {...register("pan")} placeholder="ABCDE1234F" />
            </Field>
            <Field label="Business type" error={errors.business_type?.message}>
              <select
                {...register("business_type")}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs"
              >
                <option value="individual">Individual</option>
                <option value="proprietorship">Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="private_limited">Private Limited</option>
              </select>
            </Field>
            <Field label="Bank account number" error={errors.account_number?.message}>
              <Input {...register("account_number")} />
            </Field>
            <Field label="IFSC" error={errors.ifsc?.message}>
              <Input className="uppercase" {...register("ifsc")} placeholder="HDFC0001234" />
            </Field>
            <Field label="City" error={errors.city?.message}>
              <Input {...register("city")} />
            </Field>
            <Field label="State" error={errors.state?.message}>
              <Input {...register("state")} />
            </Field>
            <Field label="PIN code" error={errors.postal_code?.message}>
              <Input {...register("postal_code")} />
            </Field>
          </div>

          <Button type="submit" variant="accent" disabled={isSubmitting || !configured}>
            {account ? "Update payout details" : "Set up payouts"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
