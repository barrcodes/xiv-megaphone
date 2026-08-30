import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLocale: vi.fn(),
  getPreferredSystemLanguages: vi.fn(),
  getLanguage: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    getLocale: mocks.getLocale,
    getPreferredSystemLanguages: mocks.getPreferredSystemLanguages,
  },
}));

vi.mock("./config", () => ({ getLanguage: mocks.getLanguage }));

describe("main i18n", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getLocale.mockReturnValue("fr-FR");
    mocks.getPreferredSystemLanguages.mockReturnValue(["de-DE"]);
  });

  it("prefers a persisted supported language over the system locale", async () => {
    mocks.getLanguage.mockResolvedValue("en");
    const { initializeMainI18n, getI18nState } = await import("./i18n");

    await initializeMainI18n();

    expect(getI18nState()).toEqual({
      systemLanguage: "fr",
      selectedLanguage: "en",
      language: "en",
    });
  });

  it("uses the resolved system language when no preference is persisted", async () => {
    mocks.getLanguage.mockResolvedValue(null);
    const { initializeMainI18n, getI18nState } = await import("./i18n");

    await initializeMainI18n();

    expect(getI18nState()).toEqual({
      systemLanguage: "fr",
      selectedLanguage: null,
      language: "fr",
    });
  });

  it("ignores an unsupported persisted preference", async () => {
    mocks.getLanguage.mockResolvedValue("es");
    const { initializeMainI18n, getI18nState } = await import("./i18n");

    await initializeMainI18n();

    expect(getI18nState().selectedLanguage).toBeNull();
    expect(getI18nState().language).toBe("fr");
  });
});
