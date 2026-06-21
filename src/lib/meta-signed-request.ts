import crypto from "node:crypto";

export type SignedRequestPayload = {
  user_id: string;
  algorithm?: string;
  issued_at?: number;
  [key: string]: unknown;
};

function base64UrlToBuffer(input: string) {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * Parse and verify Meta's `signed_request` (format: `<sig>.<payload>`,
 * HMAC-SHA256 keyed by the app secret). Throws on a bad signature.
 */
export function parseSignedRequest(signed: string): SignedRequestPayload {
  const [encSig, payload] = signed.split(".");
  if (!encSig || !payload) throw new Error("malformed signed_request");

  const expected = crypto
    .createHmac("sha256", process.env.INSTAGRAM_APP_SECRET!)
    .update(payload)
    .digest();
  const sig = base64UrlToBuffer(encSig);

  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(sig, expected)
  ) {
    throw new Error("bad signed_request signature");
  }

  const data = JSON.parse(
    base64UrlToBuffer(payload).toString("utf8")
  ) as SignedRequestPayload;
  // Meta only signs with HMAC-SHA256; reject anything else (defense-in-depth).
  if (data.algorithm && String(data.algorithm).toUpperCase() !== "HMAC-SHA256") {
    throw new Error("unexpected signed_request algorithm");
  }
  return data;
}
