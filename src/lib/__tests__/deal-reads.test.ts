import { describe, it, expect } from "vitest";
import { applyReadMarker, type ReadMarkerDeal } from "@/lib/deal-reads";

/**
 * A fake Supabase client that records whether `.update()` was called and with
 * what patch — enough to assert applyReadMarker's write decisions without a DB.
 */
function fakeClient() {
  const calls: Record<string, unknown>[] = [];
  const client = {
    from() {
      return {
        update(patch: Record<string, unknown>) {
          calls.push(patch);
          return { eq() {} };
        },
      };
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, calls };
}

const BRAND = "11111111-1111-1111-1111-111111111111";
const ARTIST = "22222222-2222-2222-2222-222222222222";

function deal(overrides: Partial<ReadMarkerDeal> = {}): ReadMarkerDeal {
  return {
    id: "deal-1",
    brand_id: BRAND,
    artist_id: ARTIST,
    status: "accepted",
    initiated_by: "brand",
    last_message_at: "2026-01-01T00:00:00.000Z",
    artist_read_at: null,
    brand_read_at: null,
    ...overrides,
  };
}

describe("applyReadMarker", () => {
  it("ignores non-participants", async () => {
    const { client, calls } = fakeClient();
    const wrote = await applyReadMarker(client, deal(), "someone-else");
    expect(wrote).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("writes when the viewer has never read the deal", async () => {
    const { client, calls } = fakeClient();
    const wrote = await applyReadMarker(client, deal(), ARTIST);
    expect(wrote).toBe(true);
    expect(calls[0]).toHaveProperty("artist_read_at");
  });

  it("skips the write when the marker already covers the latest message", async () => {
    const { client, calls } = fakeClient();
    const wrote = await applyReadMarker(
      client,
      deal({ artist_read_at: "2026-01-02T00:00:00.000Z" }), // after last_message_at
      ARTIST
    );
    expect(wrote).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("writes when a newer message arrived after the last read", async () => {
    const { client, calls } = fakeClient();
    const wrote = await applyReadMarker(
      client,
      deal({
        last_message_at: "2026-01-03T00:00:00.000Z",
        artist_read_at: "2026-01-02T00:00:00.000Z", // stale
      }),
      ARTIST
    );
    expect(wrote).toBe(true);
    expect(calls[0]).toHaveProperty("artist_read_at");
  });

  it("bumps sent -> viewed for the receiver even if caught up", async () => {
    const { client, calls } = fakeClient();
    // Brand offer the artist (receiver) is opening for the first time.
    const wrote = await applyReadMarker(
      client,
      deal({
        status: "sent",
        artist_read_at: "2026-01-02T00:00:00.000Z", // would otherwise skip
      }),
      ARTIST
    );
    expect(wrote).toBe(true);
    expect(calls[0]).toMatchObject({ status: "viewed" });
  });

  it("does NOT bump status for the initiator viewing their own sent offer", async () => {
    const { client, calls } = fakeClient();
    const wrote = await applyReadMarker(
      client,
      deal({ status: "sent", brand_read_at: null }),
      BRAND // brand initiated, so not the receiver
    );
    expect(wrote).toBe(true);
    expect(calls[0]).not.toHaveProperty("status");
  });
});
