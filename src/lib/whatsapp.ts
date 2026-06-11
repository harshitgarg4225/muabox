import "server-only";

/**
 * Optional WhatsApp notifications via Twilio. Fully no-ops when not configured,
 * so the app runs identically without it.
 *
 * Note: for business-initiated messages outside the 24h window, WhatsApp
 * requires pre-approved message templates on your Twilio/WABA account. Wire your
 * approved template copy here before going live at volume.
 */
export function whatsappConfigured() {
  return (
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_WHATSAPP_FROM
  );
}

export async function sendWhatsapp(
  to: string | null | undefined,
  body: string
): Promise<boolean> {
  if (!whatsappConfigured() || !to) return false;
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_FROM!; // e.g. "whatsapp:+14155238886"
  const toNum = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: toNum, Body: body }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
