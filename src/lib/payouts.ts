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

export function artistShare(
  amount: number,
  feePercent: number = PLATFORM_FEE_PERCENT
) {
  const pct = Math.min(100, Math.max(0, feePercent));
  const fee = Math.round((amount * pct) / 100);
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
  if (payment.status !== "paid" || !payment.razorpay_payment_id) return;
  if (payment.transfer_status === "done" || payment.transfer_status === "processing") {
    return; // fast path; the atomic claim below is the real guard
  }

  // Atomically CLAIM the transfer. Without this, the verify callback and the
  // webhook (which both fire for the same capture) could each read
  // transfer_status != 'done' and both create a transfer → double payout.
  // Only one caller wins the conditional update.
  const { data: claimed } = await admin
    .from("payments")
    .update({ transfer_status: "processing", updated_at: new Date().toISOString() })
    .eq("id", payment.id)
    .in("transfer_status", ["none", "pending", "failed"])
    .select("id");
  if (!claimed || claimed.length === 0) return; // someone else is handling it

  const { data: acct } = await admin
    .from("artist_payout_accounts")
    .select("*")
    .eq("artist_id", payment.artist_id)
    .maybeSingle();

  // Artist hasn't finished payout setup yet — release the claim back to
  // 'pending' so reconcilePendingTransfers picks it up after they onboard.
  if (!acct || acct.status !== "active" || !acct.razorpay_account_id) {
    await admin
      .from("payments")
      .update({ transfer_status: "pending", updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    return;
  }

  // Use the fee snapshotted when the brand paid, so a payout transferred later
  // (after the artist onboards) honours the split that was in effect then.
  const amount = artistShare(payment.amount, payment.fee_percent ?? undefined);
  try {
    const res = await createTransfer({
      paymentId: payment.razorpay_payment_id,
      accountId: acct.razorpay_account_id,
      amount,
      notes: { deal_id: payment.deal_id },
      // Idempotency: Razorpay rejects a duplicate reference_id, so a retry
      // after an ambiguous failure can't create a second transfer.
      referenceId: `payout_${payment.id}`,
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
