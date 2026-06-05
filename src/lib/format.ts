/** Compact number formatting (e.g. 48.2K, 1.1M). Shared across stats UIs. */
export function compact(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(n);
}
