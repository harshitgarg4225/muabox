import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

// No Upstash env in tests → exercises the in-memory fallback.
describe("rateLimit (in-memory fallback)", () => {
  it("allows up to the limit, then blocks", async () => {
    const key = `test-${Math.random()}`;
    expect((await rateLimit(key, 2, 10_000)).ok).toBe(true);
    expect((await rateLimit(key, 2, 10_000)).ok).toBe(true);
    const third = await rateLimit(key, 2, 10_000);
    expect(third.ok).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it("keeps separate keys independent", async () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect((await rateLimit(a, 1, 10_000)).ok).toBe(true);
    expect((await rateLimit(a, 1, 10_000)).ok).toBe(false);
    // A different key is unaffected.
    expect((await rateLimit(b, 1, 10_000)).ok).toBe(true);
  });
});
