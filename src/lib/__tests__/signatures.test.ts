import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { parseSignedRequest } from "@/lib/meta-signed-request";
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "@/lib/razorpay";

function metaSign(payloadObj: unknown, secret: string) {
  const payload = Buffer.from(JSON.stringify(payloadObj))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${sig}.${payload}`;
}

describe("parseSignedRequest (Meta)", () => {
  it("parses a valid signed_request", () => {
    const signed = metaSign({ user_id: "123" }, "test_app_secret");
    expect(parseSignedRequest(signed).user_id).toBe("123");
  });
  it("rejects a bad signature", () => {
    const signed = metaSign({ user_id: "123" }, "wrong_secret");
    expect(() => parseSignedRequest(signed)).toThrow();
  });
  it("rejects malformed input", () => {
    expect(() => parseSignedRequest("notvalid")).toThrow();
  });
});

describe("Razorpay signatures", () => {
  it("verifies a valid payment signature", () => {
    const orderId = "order_123";
    const paymentId = "pay_456";
    const signature = crypto
      .createHmac("sha256", "test_secret")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    expect(verifyPaymentSignature({ orderId, paymentId, signature })).toBe(true);
  });
  it("rejects a forged payment signature", () => {
    expect(
      verifyPaymentSignature({
        orderId: "o",
        paymentId: "p",
        signature: "deadbeef",
      })
    ).toBe(false);
  });
  it("verifies a valid webhook signature", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const signature = crypto
      .createHmac("sha256", "test_webhook_secret")
      .update(body)
      .digest("hex");
    expect(verifyWebhookSignature(body, signature)).toBe(true);
  });
  it("rejects a forged webhook signature", () => {
    expect(verifyWebhookSignature("{}", "00")).toBe(false);
  });
});
