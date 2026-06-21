import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentSignature, razorpayConfigured } from "@/lib/razorpay";
import { rateLimit } from "@/lib/rate-limit";
import { notifyPayment } from "@/lib/notify";
import { attemptTransfer } from "@/lib/payouts";
import type { Payment } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Client callback after Razorpay Checkout succeeds. We verify the HMAC
 * signature here for instant UX; the webhook is the durable source of truth.
 */
export async function POST(req: Request) {
  if (!razorpayConfigured()) {
    return NextResponse.json({ error: "payments_unavailable" }, { status: 503 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limit = await rateLimit(`verify:${user.id}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const orderId = body?.razorpay_order_id as string | undefined;
  const paymentId = body?.razorpay_payment_id as string | undefined;
  const signature = body?.razorpay_signature as string | undefined;

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // Service role: capture writes bypass RLS but are gated by the verified
  // signature + the brand ownership check below.
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();

  if (!payment || payment.brand_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (payment.status === "paid") {
    return NextResponse.json({ success: true });
  }

  const now = new Date().toISOString();
  // Atomically claim the capture: only transition from 'created'. The webhook
  // fires for the same payment, so without this both paths would run the deal
  // update, transfer and notification twice.
  const { data: claimed } = await admin
    .from("payments")
    .update({ status: "paid", razorpay_payment_id: paymentId, updated_at: now })
    .eq("id", payment.id)
    .eq("status", "created")
    .select("id");
  if (!claimed || claimed.length === 0) {
    // The webhook already processed this capture.
    return NextResponse.json({ success: true });
  }

  await admin.from("deals").update({ paid_at: now }).eq("id", payment.deal_id);

  // Pay the artist (Route). Fail-safe: never blocks the captured payment.
  const { data: fresh } = await admin
    .from("payments")
    .select("*")
    .eq("id", payment.id)
    .single<Payment>();
  if (fresh) await attemptTransfer(admin, fresh);

  await notifyPayment(payment.deal_id);

  return NextResponse.json({ success: true });
}
