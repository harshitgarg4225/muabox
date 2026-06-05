import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { notifyPayment } from "@/lib/notify";
import { attemptTransfer } from "@/lib/payouts";
import type { Payment } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook — the durable source of truth for captured payments.
 * Configure in the Razorpay dashboard with the `payment.captured` event and
 * the secret in RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  if (event.event === "payment.captured") {
    const entity = event.payload?.payment?.entity;
    const orderId = entity?.order_id;
    const paymentId = entity?.id;

    if (orderId) {
      const admin = createAdminClient();
      const { data: payment } = await admin
        .from("payments")
        .select("*")
        .eq("razorpay_order_id", orderId)
        .maybeSingle();

      if (payment && payment.status !== "paid") {
        const now = new Date().toISOString();
        await admin
          .from("payments")
          .update({
            status: "paid",
            razorpay_payment_id: paymentId ?? payment.razorpay_payment_id,
            updated_at: now,
          })
          .eq("id", payment.id);
        await admin
          .from("deals")
          .update({ paid_at: now })
          .eq("id", payment.deal_id);

        const { data: fresh } = await admin
          .from("payments")
          .select("*")
          .eq("id", payment.id)
          .single<Payment>();
        if (fresh) await attemptTransfer(admin, fresh);

        await notifyPayment(payment.deal_id);
      }
    }
  }

  // Always 200 so Razorpay doesn't retry indefinitely on handled events.
  return NextResponse.json({ received: true });
}
