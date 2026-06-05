import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLayout, esc } from "@/lib/email";
import { logger } from "@/lib/logger";
import { formatMoney, type DealStatus } from "@/lib/types";

/**
 * Email notifications for the deal lifecycle. Every function is fail-safe:
 * it no-ops when email isn't configured and never throws (callers run these
 * via `after()`, off the response path).
 */

function enabled() {
  return !!process.env.RESEND_API_KEY && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

type Party = { id: string; email: string | null; name: string; notify: boolean };

async function getDealParties(dealId: string) {
  const admin = createAdminClient();

  const { data: deal } = await admin
    .from("deals")
    .select("id, brand_id, artist_id, offer_amount, currency, status")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return null;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name, email_notifications")
    .in("id", [deal.brand_id, deal.artist_id]);
  const { data: brandRow } = await admin
    .from("brands")
    .select("company_name")
    .eq("id", deal.brand_id)
    .maybeSingle();
  const { data: artistRow } = await admin
    .from("artists")
    .select("display_name")
    .eq("id", deal.artist_id)
    .maybeSingle();

  const profById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      p as {
        id: string;
        email: string | null;
        full_name: string | null;
        email_notifications: boolean | null;
      },
    ])
  );

  const brand: Party = {
    id: deal.brand_id,
    email: profById.get(deal.brand_id)?.email ?? null,
    name:
      brandRow?.company_name ||
      profById.get(deal.brand_id)?.full_name ||
      "A brand",
    notify: profById.get(deal.brand_id)?.email_notifications !== false,
  };
  const artist: Party = {
    id: deal.artist_id,
    email: profById.get(deal.artist_id)?.email ?? null,
    name:
      artistRow?.display_name ||
      profById.get(deal.artist_id)?.full_name ||
      "An artist",
    notify: profById.get(deal.artist_id)?.email_notifications !== false,
  };

  return { deal, brand, artist };
}

export async function notifyNewDeal(dealId: string) {
  if (!enabled()) return;
  try {
    const parties = await getDealParties(dealId);
    if (!parties) return;
    const { deal, brand, artist } = parties;
    if (!artist.notify) return;
    const budget =
      deal.offer_amount != null
        ? formatMoney(deal.offer_amount, deal.currency)
        : "Open budget";
    await sendEmail({
      to: artist.email,
      subject: `${brand.name} sent you a collab offer 💄`,
      html: emailLayout({
        heading: "You have a new deal",
        intro: `<strong>${esc(brand.name)}</strong> wants to collaborate with you on Muabox. Budget: <strong>${esc(budget ?? "Open budget")}</strong>. Open the deal to read their offer and reply.`,
        ctaText: "View the deal",
        ctaPath: `/deals/${dealId}`,
        footnote: "Reply, accept, or decline right from the deal page.",
      }),
    });
  } catch (err) {
    logger.error("notification email failed", err);
  }
}

export async function notifyDealResponse(dealId: string, status: DealStatus) {
  if (!enabled()) return;
  if (status !== "accepted" && status !== "declined") return;
  try {
    const parties = await getDealParties(dealId);
    if (!parties) return;
    const { brand, artist } = parties;
    if (!brand.notify) return;
    const accepted = status === "accepted";
    await sendEmail({
      to: brand.email,
      subject: accepted
        ? `${artist.name} accepted your deal 🎉`
        : `${artist.name} responded to your deal`,
      html: emailLayout({
        heading: accepted ? "Your deal was accepted!" : "Your deal was declined",
        intro: accepted
          ? `<strong>${esc(artist.name)}</strong> accepted your collab offer. Open the deal to coordinate the details.`
          : `<strong>${esc(artist.name)}</strong> declined your collab offer this time. Browse more artists who fit your launch.`,
        ctaText: accepted ? "Open the deal" : "Discover artists",
        ctaPath: accepted ? `/deals/${dealId}` : "/discover",
      }),
    });
  } catch (err) {
    logger.error("notification email failed", err);
  }
}

export async function notifyDealCompleted(dealId: string, actorId: string) {
  if (!enabled()) return;
  try {
    const parties = await getDealParties(dealId);
    if (!parties) return;
    const { brand, artist } = parties;
    const recipient = actorId === brand.id ? artist : brand;
    if (!recipient.notify) return;
    await sendEmail({
      to: recipient.email,
      subject: "A deal was marked completed ✅",
      html: emailLayout({
        heading: "Collaboration completed",
        intro: `Your collaboration on Muabox was marked as completed. Thanks for using Muabox — we hope it went great!`,
        ctaText: "View the deal",
        ctaPath: `/deals/${dealId}`,
      }),
    });
  } catch (err) {
    logger.error("notification email failed", err);
  }
}

export async function notifyPayment(dealId: string) {
  if (!enabled()) return;
  try {
    const parties = await getDealParties(dealId);
    if (!parties) return;
    const { deal, brand, artist } = parties;
    if (!artist.notify) return;
    const amount =
      deal.offer_amount != null
        ? formatMoney(deal.offer_amount, deal.currency)
        : "your fee";
    await sendEmail({
      to: artist.email,
      subject: `You've been paid ${amount} 💸`,
      html: emailLayout({
        heading: "Payment received",
        intro: `<strong>${esc(brand.name)}</strong> has paid <strong>${esc(amount ?? "your fee")}</strong> for your collaboration on Muabox.`,
        ctaText: "View the deal",
        ctaPath: `/deals/${dealId}`,
        footnote:
          "Payments are processed securely via Razorpay. Payout to your account follows your payout setup.",
      }),
    });
  } catch (err) {
    logger.error("notification email failed", err);
  }
}

export async function notifyNewMessage(dealId: string, senderId: string) {
  if (!enabled()) return;
  try {
    const parties = await getDealParties(dealId);
    if (!parties) return;
    const { brand, artist } = parties;
    const sender = senderId === brand.id ? brand : artist;
    const recipient = senderId === brand.id ? artist : brand;
    if (!recipient.notify) return;
    await sendEmail({
      to: recipient.email,
      subject: `New message from ${sender.name}`,
      html: emailLayout({
        heading: `${esc(sender.name)} sent you a message`,
        intro: `You have a new message on your Muabox deal. Open the conversation to reply.`,
        ctaText: "Read & reply",
        ctaPath: `/deals/${dealId}`,
      }),
    });
  } catch (err) {
    logger.error("notification email failed", err);
  }
}
