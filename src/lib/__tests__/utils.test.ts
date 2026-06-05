import { describe, it, expect } from "vitest";
import { cn, safeNextPath } from "@/lib/utils";

describe("cn", () => {
  it("merges and dedupes tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-navy", false && "hidden", "font-bold")).toBe(
      "text-navy font-bold"
    );
  });
});

describe("safeNextPath", () => {
  it("allows same-origin paths", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/deals/123")).toBe("/deals/123");
  });
  it("blocks open-redirect vectors", () => {
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.com")).toBe("/dashboard");
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
    expect(safeNextPath("evil.com")).toBe("/dashboard");
  });
  it("falls back for empty/nullish", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath(undefined, "/x")).toBe("/x");
    expect(safeNextPath("")).toBe("/dashboard");
  });
});
