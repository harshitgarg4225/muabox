/**
 * Minimal Resend integration (REST, no SDK dependency).
 * Fully no-ops when RESEND_API_KEY is unset, so the app runs fine without email.
 */
const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | null | undefined;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Muabox <onboarding@resend.dev>";
  if (!key || !to) return false;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://muabox.app";

/** Escape user-supplied text before inlining into email HTML. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Branded (navy/yellow) HTML email with a single CTA. */
export function emailLayout({
  heading,
  intro,
  ctaText,
  ctaPath,
  footnote,
  greeting,
}: {
  heading: string;
  intro: string;
  ctaText: string;
  ctaPath: string;
  footnote?: string;
  greeting?: string;
}): string {
  const href = `${APP_URL}${ctaPath}`;
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f3f5fa;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b0b0f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(10,31,68,0.08);">
          <tr><td style="background:#0a1f44;padding:20px 24px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;">
              <span style="color:#ffc700;">✦</span> Muabox
            </span>
          </td></tr>
          <tr><td style="padding:28px 24px;">
            <h1 style="margin:0 0 12px;font-size:20px;color:#0a1f44;">${heading}</h1>
            ${
              greeting
                ? `<p style="margin:0 0 8px;font-size:15px;color:#3a4252;">${greeting}</p>`
                : ""
            }
            <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#3a4252;">${intro}</p>
            <a href="${href}" style="display:inline-block;background:#ffc700;color:#0a1f44;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:12px;">${ctaText}</a>
            ${
              footnote
                ? `<p style="margin:24px 0 0;font-size:13px;color:#8a93a6;">${footnote}</p>`
                : ""
            }
          </td></tr>
          <tr><td style="padding:16px 24px;border-top:1px solid #e7e9f0;">
            <p style="margin:0;font-size:12px;color:#8a93a6;">You're receiving this because you have a Muabox account. Manage your profile any time in the app.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
