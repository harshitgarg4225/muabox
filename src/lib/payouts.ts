import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createTransfer, routeConfigured } from "@/lib/razorpay-route";
import { logger } from "@/lib/logger";
import type { Payment } from "@/lib/types";

/** Platform commission withheld from each artist payout (percent). */
export const PLATFORM_FEE_PERCENT = Math.min(
  100,
  Math.max(0, Number(process.env.PLATFORM_FEE_PERCENT ?? 10))
);

export function artistShare(amount: number) {
  const fee = Math.round((amount * PLATFORM_FEE_PERCENT) / 100);
  return Math.max(0, amount - fee);
}

/**
 * Try to transfer a captured payment to the artist's Route account.
 * Never throws — sets transfer_status so it can be retried later.
 * Requires a service-role client.
 */
export async function attemptTransfer(
  admin: SupabaseClient,
  payment: Payment
): Promise<void> {
  if (!routeConfigured()) return;
  if (payment.transfer_status === "done") return;
  if (payment.status !== "paid" || !payment.razorpay_payment_id) return;

  const { data: acct } = await admin
    .from("artist_payout_accounts")
    .select("*")
    .eq("artist_id", payment.artist_id)
    .maybeSingle();

  // Artist hasn't finished payout setup yet — hold for later reconcile.
  if (!acct || acct.status !== "active" || !acct.razorpay_account_id) {
    await admin
      .from("payments")
      .update({ transfer_status: "pending", updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    return;
  }

  const amount = artistShare(payment.amount);
  try {
    const res = await createTransfer({
      paymentId: payment.razorpay_payment_id,
      accountId: acct.razorpay_account_id,
      amount,
      notes: { deal_id: payment.deal_id },
    });
    await admin
      .from("payments")
      .update({
        transfer_status: "done",
        transfer_id: res.items?.[0]?.id ?? null,
        transferred_amount: amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
  } catch (err) {
    logger.error("route transfer failed", err, {
      paymentId: payment.id,
      dealId: payment.deal_id,
    });
    await admin
      .from("payments")
      .update({ transfer_status: "failed", updated_at: new Date().toISOString() })
      .eq("id", payment.id);
  }
}

/** After an artist activates payouts, push any held (pending) transfers. */
export async function reconcilePendingTransfers(
  admin: SupabaseClient,
  artistId: string
): Promise<void> {
  const { data: pendings } = await admin
    .from("payments")
    .select("*")
    .eq("artist_id", artistId)
    .eq("status", "paid")
    .in("transfer_status", ["pending", "failed"]);

  for (const p of (pendings as Payment[] | null) ?? []) {
    await attemptTransfer(admin, p);
  }
}
