/**
 * Sliding/fixed-window rate limiter.
 *
 * - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, limits are
 *   enforced GLOBALLY via Upstash Redis (correct on multi-instance/serverless),
 *   using a per-window fixed-window counter.
 * - Otherwise it falls back to a best-effort in-memory sliding window (per
 *   server instance — still blunts rapid bursts on a warm instance).
 *
 * On any Redis error it degrades to the in-memory limiter rather than failing
 * open to unlimited.
 */

type Result = { ok: boolean; retryAfterMs: number };

const buckets = new Map<string, number[]>();

function memoryLimit(key: string, limit: number, windowMs: number): Result {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    const retryAfterMs = hits[0] + windowMs - now;
    buckets.set(key, hits);
    return { ok: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      const fresh = v.filter((t) => t > cutoff);
      if (fresh.length === 0) buckets.delete(k);
      else buckets.set(k, fresh);
    }
  }

  return { ok: true, retryAfterMs: 0 };
}

/** Run an Upstash REST pipeline; returns the results array or null on failure. */
async function upstashPipeline(
  commands: (string | number)[][]
): Promise<{ result: unknown }[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(1000), // never let the limiter hang a request
    });
    if (!res.ok) return null;
    return (await res.json()) as { result: unknown }[];
  } catch {
    return null;
  }
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<Result> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Fixed window keyed by the current window index, so the key self-rotates
    // and we can expire it without an extra round-trip.
    const windowIndex = Math.floor(Date.now() / windowMs);
    const k = `rl:${key}:${windowIndex}`;
    const out = await upstashPipeline([
      ["INCR", k],
      ["PEXPIRE", k, windowMs],
    ]);
    const count = out?.[0]?.result;
    if (typeof count === "number") {
      const ok = count <= limit;
      return {
        ok,
        retryAfterMs: ok ? 0 : windowMs - (Date.now() % windowMs),
      };
    }
    // Redis unreachable → fall back to the in-memory limiter below.
  }
  return memoryLimit(key, limit, windowMs);
}
