/**
 * Detailed pricing vocabulary for luxury MUAs and brand campaigns.
 */

// Deliverable formats an artist can put a rate against.
export const DELIVERABLES = [
  "Instagram Reel",
  "Instagram Story (per story)",
  "Feed Post",
  "Carousel Post",
  "Reel + Stories bundle",
  "Long-form / IGTV",
  "Bridal / Editorial look feature",
  "Event appearance",
  "Brand ambassador (monthly)",
] as const;

// Collaboration formats an artist accepts.
export const COLLAB_TYPES = [
  "Paid",
  "Gifted / barter",
  "Paid + product",
  "Event / appearance",
  "Brand ambassador",
] as const;

// What a brand campaign offers.
export const COMPENSATION_TYPES = [
  { value: "paid", label: "Paid only" },
  { value: "gifted", label: "Gifted product (barter)" },
  { value: "paid_product", label: "Paid + product" },
  { value: "commission", label: "Commission / affiliate" },
] as const;

export type RateCardItem = { deliverable: string; price: number | null }; // price in paise

export function compensationLabel(value: string | null | undefined) {
  return COMPENSATION_TYPES.find((c) => c.value === value)?.label ?? null;
}

export function isDeliverable(s: string) {
  return (DELIVERABLES as readonly string[]).includes(s);
}

export function isCollabType(s: string) {
  return (COLLAB_TYPES as readonly string[]).includes(s);
}

export function isCompensationType(s: string) {
  return COMPENSATION_TYPES.some((c) => c.value === s);
}

/** Parse + validate a rate card JSON string from a form (prices in paise). */
export function parseRateCard(raw: string | null | undefined): RateCardItem[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const out: RateCardItem[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const deliverable = String((item as RateCardItem).deliverable ?? "");
    if (!isDeliverable(deliverable) || seen.has(deliverable)) continue;
    const rawPrice = (item as RateCardItem).price;
    const price =
      rawPrice == null || rawPrice === ("" as unknown)
        ? null
        : Math.max(0, Math.round(Number(rawPrice)));
    if (price != null && !Number.isFinite(price)) continue;
    seen.add(deliverable);
    out.push({ deliverable, price });
    if (out.length >= 12) break;
  }
  return out;
}

export function parseCollabTypes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [
    ...new Set(raw.split(",").map((s) => s.trim()).filter(isCollabType)),
  ];
}
