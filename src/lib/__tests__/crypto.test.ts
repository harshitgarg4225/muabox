import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "@/lib/crypto";

describe("token crypto (AES-256-GCM)", () => {
  it("round-trips a token", () => {
    const token = "IGAAR_super_secret_token_value_123";
    const enc = encryptToken(token);
    expect(enc).not.toContain(token);
    expect(enc.split(":")).toHaveLength(3);
    expect(decryptToken(enc)).toBe(token);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptToken("same");
    const b = encryptToken("same");
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe("same");
    expect(decryptToken(b)).toBe("same");
  });

  it("fails to decrypt a tampered ciphertext", () => {
    const enc = encryptToken("hello");
    const [iv, tag, ct] = enc.split(":");
    const tampered = [iv, tag, ct.replace(/.$/, (c) => (c === "0" ? "1" : "0"))].join(":");
    expect(() => decryptToken(tampered)).toThrow();
  });
});
