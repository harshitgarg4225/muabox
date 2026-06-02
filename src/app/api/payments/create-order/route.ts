import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOrder, razorpayConfigured } from "@/lib/razorpay";
import type { Deal } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!razorpayConfigured()) {
    return NextResponse.json({ error: "payments_unavailable" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { dealId } = await req.json().catch(() => ({ dealId: null }));
  if (!dealId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // RLS already restricts to deals the user participates in.
  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .maybeSingle<Deal>();

  if (!deal) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (deal.brand_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (deal.paid_at) {
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }
  if (deal.status !== "accepted" && deal.status !== "completed") {
    return NextResponse.json({ error: "not_payable" }, { status: 409 });
  }
  // Amount is derived from the deal server-side — never from the client.
  const amount = deal.offer_amount;
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "no_amount" }, { status: 409 });
  }

  try {
    const order = await createOrder({
      amount,
      currency: "INR",
      receipt: `deal_${String(dealId).slice(0, 24)}`,
      notes: {
        deal_id: String(dealId),
        brand_id: deal.brand_id,
        artist_id: deal.artist_id,
      },
    });

    // Record the intent (RLS: brand_id must equal auth.uid()).
    await supabase.from("payments").insert({
      deal_id: dealId,
      brand_id: deal.brand_id,
      artist_id: deal.artist_id,
      razorpay_order_id: order.id,
      amount,
      currency: "INR",
      status: "created",
    });

    return NextResponse.json({
      orderId: order.id,
      amount,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch {
    return NextResponse.json({ error: "order_failed" }, { status: 502 });
  }
}
