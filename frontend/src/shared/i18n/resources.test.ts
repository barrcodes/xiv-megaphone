import { describe, expect, it } from "vitest";
import { resources, supportedLanguages } from "./resources";

function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];

  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("translation resources", () => {
  it("has one translation tree for every supported language", () => {
    expect(Object.keys(resources).sort()).toEqual([...supportedLanguages].sort());
  });

  it("keeps translation keys structurally identical across languages", () => {
    const languages = Object.values(resources);
    const expected = leafPaths(languages[0].translation).sort();

    for (const resource of languages) {
      expect(leafPaths(resource.translation).sort()).toEqual(expected);
    }
  });
});
