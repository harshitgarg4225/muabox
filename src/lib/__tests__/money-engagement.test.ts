import { describe, it, expect } from "vitest";
import { formatMoney } from "@/lib/types";
import { engagementRate } from "@/lib/instagram";

describe("formatMoney", () => {
  it("formats paise as INR rupees", () => {
    expect(formatMoney(150000, "INR")).toContain("1,500");
    expect(formatMoney(150000, "INR")).toContain("₹");
  });
  it("returns null for null input", () => {
    expect(formatMoney(null)).toBeNull();
  });
});

describe("engagementRate", () => {
  it("returns 0 when followers missing or no media", () => {
    expect(engagementRate([], 1000)).toBe(0);
    expect(engagementRate([{ like_count: 10, comments_count: 2 }], 0)).toBe(0);
    expect(engagementRate([{ like_count: 10, comments_count: 2 }], null)).toBe(0);
  });
  it("computes avg engagement as a percentage with one decimal", () => {
    // avg(like+comment) = (100+50 + 200+100)/2 = (150+300)/2 = 225; /1000*100 = 22.5
    const rate = engagementRate(
      [
        { like_count: 100, comments_count: 50 },
        { like_count: 200, comments_count: 100 },
      ],
      1000
    );
    expect(rate).toBe(22.5);
  });
  it("treats missing counts as zero", () => {
    expect(engagementRate([{ like_count: null, comments_count: null }], 100)).toBe(0);
  });
});
