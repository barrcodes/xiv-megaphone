import { beforeEach, describe, expect, it, vi } from "vitest";

describe("renderer i18n", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", {
      electronAPI: {
        getI18nState: vi.fn(),
        setLanguage: vi.fn(),
      },
    });
  });

  it("initializes with the language selected by the main process", async () => {
    const getI18nState = vi.mocked(window.electronAPI.getI18nState);
    getI18nState.mockResolvedValue({
      systemLanguage: "en",
      selectedLanguage: "en",
      language: "en",
    });
    const { initializeRendererI18n, i18next } = await import("./i18n");

    await initializeRendererI18n();

    expect(getI18nState).toHaveBeenCalledOnce();
    expect(i18next.language).toBe("en");
    expect(i18next.t("common.language")).toBe("Language");
  });

  it("synchronizes the renderer when the selected language changes", async () => {
    vi.mocked(window.electronAPI.getI18nState).mockResolvedValue({
      systemLanguage: "en",
      selectedLanguage: null,
      language: "en",
    });
    vi.mocked(window.electronAPI.setLanguage).mockResolvedValue({
      systemLanguage: "fr",
      selectedLanguage: "fr",
      language: "fr",
    });
    const { initializeRendererI18n, i18next, synchronizeRendererLanguage } = await import("./i18n");

    await initializeRendererI18n();
    await synchronizeRendererLanguage("fr");

    expect(i18next.resolvedLanguage).toBe("fr");
  });
});
