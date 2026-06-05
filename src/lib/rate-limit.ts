/**
 * Best-effort in-memory sliding-window rate limiter.
 *
 * Note: state is per server instance, so on multi-instance/serverless it limits
 * per-instance (still blunts rapid bursts on a warm instance). For strict global
 * limits, swap the Map for Upstash Redis / @vercel/kv — the interface stays the
 * same.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterMs: number } {
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
