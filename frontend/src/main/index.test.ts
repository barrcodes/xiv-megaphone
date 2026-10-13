import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readyToShow: undefined as (() => void) | undefined,
  trayFailure: "none" as "none" | "constructor" | "menu",
  window: {
    webContents: { on: vi.fn(), send: vi.fn() },
    loadFile: vi.fn(),
    on: vi.fn(),
    isDestroyed: () => false,
    isMinimized: () => false,
    show: vi.fn(),
    focus: vi.fn(),
  },
  tray: {
    destroy: vi.fn(),
    setContextMenu: vi.fn(),
    setToolTip: vi.fn(),
    on: vi.fn(),
  },
  registerIpcHandlers: vi.fn(),
  updateElectronApp: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    requestSingleInstanceLock: () => true,
    setAsDefaultProtocolClient: vi.fn(),
    whenReady: () => Promise.resolve(),
    on: vi.fn(),
    isPackaged: true,
  },
  BrowserWindow: class {
    constructor() {
      Object.assign(this, mocks.window);
    }
    once(_event: string, callback: () => void) {
      mocks.readyToShow = callback;
    }
  },
  Tray: class {
    constructor() {
      if (mocks.trayFailure === "constructor") throw new Error("Tray unavailable");
      Object.assign(this, mocks.tray);
    }
  },
  autoUpdater: { on: vi.fn() },
  ipcMain: { on: vi.fn() },
  Menu: { buildFromTemplate: vi.fn((template) => template) },
  nativeImage: { createFromPath: vi.fn() },
}));
vi.mock("electron-squirrel-startup", () => ({ default: false }));
vi.mock("update-electron-app", () => ({ updateElectronApp: mocks.updateElectronApp }));
vi.mock("./config", () => ({
  getStartOnStartup: async () => false,
  setStartOnStartup: vi.fn(),
}));
vi.mock("./i18n", () => ({ initializeMainI18n: vi.fn(), translate: (key: string) => key }));
vi.mock("./ipc", () => ({
  registerIpcHandlers: mocks.registerIpcHandlers,
  pushConnectionChanged: vi.fn(),
}));
vi.mock("./logger", () => ({ initLogger: vi.fn() }));
vi.mock("./presets", () => ({ bootstrap: vi.fn() }));
vi.mock("./tts-manager", () => ({
  TtsManager: class {
    setWebContents() {}
  },
}));
vi.mock("./utils/resources", () => ({ getNativeImage: vi.fn() }));

describe("Windows tray initialization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.readyToShow = undefined;
    mocks.tray.setContextMenu.mockImplementation(() => {
      if (mocks.trayFailure === "menu") throw new Error("Tray menu unavailable");
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(["constructor", "menu"] as const)(
    "shows the window when tray %s initialization fails",
    async (failure) => {
      mocks.trayFailure = failure;
      await import("./index");
      await vi.waitFor(() => expect(mocks.readyToShow).toBeDefined());
      // Let the remainder of the asynchronous startup finish before ready-to-show.
      await vi.waitFor(() => expect(mocks.updateElectronApp).toHaveBeenCalledOnce());
      mocks.readyToShow?.();
      expect(mocks.window.show).toHaveBeenCalledOnce();
      expect(mocks.window.focus).toHaveBeenCalledOnce();
      expect(mocks.tray.destroy).toHaveBeenCalledTimes(failure === "menu" ? 1 : 0);
    },
  );

  it("keeps normal tray startup hidden and preserves the Windows updater", async () => {
    mocks.trayFailure = "none";
    await import("./index");
    await vi.waitFor(() => expect(mocks.readyToShow).toBeDefined());
    mocks.readyToShow?.();
    expect(mocks.updateElectronApp).toHaveBeenCalledOnce();
    expect(mocks.window.show).not.toHaveBeenCalled();
    expect(mocks.tray.destroy).not.toHaveBeenCalled();
  });
});
