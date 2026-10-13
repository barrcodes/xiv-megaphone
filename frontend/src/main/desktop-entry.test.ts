import { describe, expect, it } from "vitest";
import { escapeDesktopExecArg, escapeDesktopString } from "./desktop-entry";

describe("freedesktop entry escaping", () => {
  it("escapes executable paths for desktop decoding followed by Exec parsing", () => {
    expect(escapeDesktopExecArg("a\\b")).toBe(`a${"\\".repeat(4)}b`);
    const escapedSpecials = ['"', "$", "`"]
      .map((character) => `${"\\".repeat(2)}${character}`)
      .join("");
    expect(escapeDesktopExecArg('"$`%')).toBe(`${escapedSpecials}%%`);
    expect(escapeDesktopExecArg("home\nuser\tapp\r")).toBe("home\\nuser\\tapp\\r");
  });

  it("uses generic desktop string escaping for icon values", () => {
    expect(escapeDesktopString("/home/a b\\icon.png")).toBe(`/home/a b${"\\".repeat(2)}icon.png`);
    expect(escapeDesktopString("a\nb\tc\r")).toBe("a\\nb\\tc\\r");
    expect(escapeDesktopString('$`%" ')).toBe('$`%" ');
  });
});
