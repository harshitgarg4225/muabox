import crypto from "node:crypto";

const KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY ?? "", "hex"); // 32 bytes

function assertKey() {
  if (KEY.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters"
    );
  }
}

/** AES-256-GCM encrypt. Returns "iv:tag:ciphertext" (all hex). */
export function encryptToken(plain: string) {
  assertKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(":");
}

export function decryptToken(stored: string) {
  assertKey();
  const [iv, tag, enc] = stored.split(":").map((h) => Buffer.from(h, "hex"));
  const d = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
