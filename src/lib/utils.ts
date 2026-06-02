import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Only allow same-origin redirect targets (a path beginning with a single "/").
 * Blocks open-redirect vectors like "//evil.com", "/\evil.com" or absolute URLs.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
