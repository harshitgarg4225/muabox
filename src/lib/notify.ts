import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLayout, esc } from "@/lib/email";
import { logger } from "@/lib/logger";
import { sendWhatsapp } from "@/lib/whatsapp";
import { firstName } from "@/lib/greeting";
import { formatMoney, type DealStatus, type UserRole } from "@/lib/types";

function hi(name: string) {
  const fn = firstName(name);
  return fn ? `Hi ${esc(fn)},` : "Hi,";
}

/**
 * Email notifications for the deal lifecycle. Every function is fail-safe:
 * it no-ops when email isn't configured and never throws (callers run these
 * via `after()`, off the response path).
 */

function enabled() {
  return !!process.env.RESEND_API_KEY && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

type Party = { id: string; email: string | null; name: string; notify: boolean; whatsapp: string | null };

async function getDealParties(dealId: string) {
  const admin = createAdminClient();

  const { data: deal } = await admin
    .from("deals")
    .select("id, brand_id, artist_id, offer_amount, currency, status, initiated_by")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return null;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name, email_notifications, whatsapp")
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
        whatsapp: string | null;
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
    whatsapp: profById.get(deal.brand_id)?.whatsapp ?? null,
  };
  const artist: Party = {
    id: deal.artist_id,
    email: profById.get(deal.artist_id)?.email ?? null,
    name:
      artistRow?.display_name ||
      profById.get(deal.artist_id)?.full_name ||
      "An artist",
    notify: profById.get(deal.artist_id)?.email_notifications !== false,
    whatsapp: profById.get(deal.artist_id)?.whatsapp ?? null,
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
        greeting: hi(artist.name),
        heading: "You have a new deal",
        intro: `<strong>${esc(brand.name)}</strong> wants to collaborate with you on Muabox. Budget: <strong>${esc(budget ?? "Open budget")}</strong>. Open the deal to read their offer and reply.`,
        ctaText: "View the deal",
        ctaPath: `/deals/${dealId}`,
        footnote: "Reply, accept, or decline right from the deal page.",
      }),
    });
    if (artist.notify)
      await sendWhatsapp(
        artist.whatsapp,
        `💄 ${brand.name} sent you a new collab offer on Muabox. Open your deals to reply.`
      );
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
    const { deal, brand, artist } = parties;
    // The initiator gets notified of the receiver's response.
    const isPitch = deal.initiated_by === "artist";
    const recipient = isPitch ? artist : brand;
    const responder = isPitch ? brand : artist;
    if (!recipient.notify) return;
    const accepted = status === "accepted";
    const thing = isPitch ? "pitch" : "deal";
    await sendEmail({
      to: recipient.email,
      subject: accepted
        ? `${responder.name} accepted your ${thing} 🎉`
        : `${responder.name} responded to your ${thing}`,
      html: emailLayout({
        heading: accepted
          ? `Your ${thing} was accepted!`
          : `Your ${thing} was declined`,
        intro: accepted
          ? `<strong>${esc(responder.name)}</strong> accepted your ${thing}. Open the deal to coordinate the details.`
          : `<strong>${esc(responder.name)}</strong> declined your ${thing} this time.`,
        ctaText: accepted ? "Open the deal" : "Back to Muabox",
        ctaPath: accepted ? `/deals/${dealId}` : "/dashboard",
      }),
    });
    if (accepted && recipient.notify)
      await sendWhatsapp(
        recipient.whatsapp,
        `🎉 ${responder.name} accepted your ${thing} on Muabox.`
      );
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
        greeting: hi(artist.name),
        heading: "Payment received",
        intro: `<strong>${esc(brand.name)}</strong> has paid <strong>${esc(amount ?? "your fee")}</strong> for your collaboration on Muabox.`,
        ctaText: "View the deal",
        ctaPath: `/deals/${dealId}`,
        footnote:
          "Payments are processed securely via Razorpay. Payout to your account follows your payout setup.",
      }),
    });
    if (artist.notify)
      await sendWhatsapp(
        artist.whatsapp,
        `💸 You've been paid ${amount ?? "your fee"} on Muabox. The transfer to your bank is on its way.`
      );
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

export async function notifyNewPitch(dealId: string) {
  if (!enabled()) return;
  try {
    const parties = await getDealParties(dealId);
    if (!parties) return;
    const { deal, brand, artist } = parties;
    if (!brand.notify) return;
    const rate =
      deal.offer_amount != null
        ? formatMoney(deal.offer_amount, deal.currency)
        : null;
    await sendEmail({
      to: brand.email,
      subject: `${artist.name} pitched you a collaboration ✨`,
      html: emailLayout({
        greeting: hi(brand.name),
        heading: "You have a new pitch",
        intro: `<strong>${esc(artist.name)}</strong> would like to collaborate with your brand on Muabox${
          rate ? ` (proposed rate: <strong>${esc(rate)}</strong>)` : ""
        }. Open the pitch to review their profile and respond.`,
        ctaText: "Review the pitch",
        ctaPath: `/deals/${dealId}`,
      }),
    });
  } catch (err) {
    logger.error("notification email failed", err);
  }
}

export async function notifyReminder(dealId: string) {
  if (!enabled()) return;
  try {
    const parties = await getDealParties(dealId);
    if (!parties) return;
    const { brand, artist } = parties;
    if (!artist.notify) return;
    await sendEmail({
      to: artist.email,
      subject: `Reminder: ${brand.name} is waiting on your reply`,
      html: emailLayout({
        greeting: hi(artist.name),
        heading: "A brand is waiting on you",
        intro: `<strong>${esc(brand.name)}</strong> sent you a collab offer on Muabox and hasn't heard back yet. A quick accept or decline keeps your response rate strong.`,
        ctaText: "Respond now",
        ctaPath: `/deals/${dealId}`,
      }),
    });
  } catch (err) {
    logger.error("notification email failed", err);
  }
}

export async function notifyWelcome(userId: string, role: UserRole) {
  if (!enabled()) return;
  try {
    const admin = createAdminClient();
    const { data: p } = await admin
      .from("profiles")
      .select("email, full_name, email_notifications")
      .eq("id", userId)
      .maybeSingle();
    if (!p?.email || p.email_notifications === false) return;

    const isArtist = role === "artist";
    await sendEmail({
      to: p.email,
      subject: isArtist
        ? "Welcome to Muabox — let's get you brand deals 💄"
        : "Welcome to Muabox — find your artists 🤝",
      html: emailLayout({
        greeting: hi(p.full_name ?? ""),
        heading: "Welcome to Muabox!",
        intro: isArtist
          ? "You're in. Connect your Instagram, set your rate card and flip on <strong>accepting deals</strong> — skincare brands browse the roster every day. Your dashboard walks you through it step by step."
          : "You're in. Set up your brand profile, create your first campaign with a budget, and start inviting luxury makeup artists — your dashboard walks you through it step by step.",
        ctaText: "Open my dashboard",
        ctaPath: "/dashboard",
        footnote: "Questions? Just reply to this email — a human reads it.",
      }),
    });
  } catch (err) {
    logger.error("notification email failed", err);
  }
}
