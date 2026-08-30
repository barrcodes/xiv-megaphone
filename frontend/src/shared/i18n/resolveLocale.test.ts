import { describe, expect, it } from "vitest";
import { resolveLocale } from "./resolveLocale";

describe("resolveLocale", () => {
  it("normalizes regional locale tags", () => {
    expect(resolveLocale(["en-US"])).toBe("en");
    expect(resolveLocale(["EN-gb"])).toBe("en");
  });

  it("uses the first supported preference", () => {
    expect(resolveLocale(["fr-FR", "en-US", "en"])).toBe("fr");
  });

  it.each([
    { preferred: [] },
    { preferred: ["es-ES"] },
    { preferred: [""] },
    { preferred: ["   "] },
  ])("falls back for $preferred", ({ preferred }) => {
    expect(resolveLocale(preferred)).toBe("en");
  });
});
