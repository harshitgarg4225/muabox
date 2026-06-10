/**
 * Luxury MUA specialties — the niche vocabulary of the marketplace.
 * Shared by artist settings, discover filters and campaign targeting.
 */
export const SPECIALTIES = [
  "Bridal",
  "Editorial",
  "Celebrity",
  "Fashion & Runway",
  "HD & Airbrush",
  "SFX & Avant-garde",
  "Destination Weddings",
  "Beauty Educator",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export function isSpecialty(s: string): s is Specialty {
  return (SPECIALTIES as readonly string[]).includes(s);
}

/** Parse a comma-separated form value into a clean, validated list. */
export function parseSpecialties(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(isSpecialty))];
}
