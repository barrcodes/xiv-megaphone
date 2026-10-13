import path, { join } from "node:path";
import {
  app,
  BrowserWindow,
  autoUpdater as electronNativeUpdater,
  ipcMain,
  Menu,
  nativeImage,
  Tray,
} from "electron";
import SquirrelStartup from "electron-squirrel-startup";
import appIcon from "../../art-assets/icon-wake-256.png?asset";
import type { ConnectionStatus } from "../shared/types";
import { getStartOnStartup, setStartOnStartup } from "./config";
import { initializeMainI18n, translate } from "./i18n";
import { pushConnectionChanged, registerIpcHandlers } from "./ipc";
import { DeepLinkQueue } from "./linux-updater-state";
import { initLogger } from "./logger";
import { bootstrap } from "./presets";
import { TtsManager } from "./tts-manager";
import { getNativeImage } from "./utils/resources";

let ownsSingleInstanceLock = app.requestSingleInstanceLock();

if (!ownsSingleInstanceLock) {
  app.quit();
}

if (SquirrelStartup) {
  process.exit(0);
}

const PROTOCOL = "xiv-megaphone";

if (ownsSingleInstanceLock) {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    }
  } else if (!(process.platform === "linux" && process.env.APPIMAGE)) {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let ttsManager: TtsManager | null = null;
let isQuitting = false;
let mainInitialized = false;
let shouldShowWindow = false;
const deepLinkQueue = new DeepLinkQueue();
let isLinuxUpdateDownloaded = () => false;
let restartLinuxUpdate = async () => {};
let beforeQuitForUpdate = () => {};
let stopLinuxUpdater = () => {};

electronNativeUpdater.on("before-quit-for-update", () => {
  beforeQuitForUpdate();
  isQuitting = true;
});

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function sendDeepLinks(channel: "authCallback" | "checkoutComplete", payloads: unknown[]) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  for (const payload of payloads) mainWindow.webContents.send(channel, payload);
  if (payloads.length > 0) {
    if (mainInitialized) focusMainWindow();
    else shouldShowWindow = true;
  }
}

function deliverDeepLink(channel: "authCallback" | "checkoutComplete", payload: unknown) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    deepLinkQueue.setReady(channel, false);
    deepLinkQueue.enqueue(channel, payload);
    shouldShowWindow = true;
    if (app.isReady()) openMainWindow();
    return;
  }
  const payloads = deepLinkQueue.enqueue(channel, payload);
  if (payloads.length > 0) sendDeepLinks(channel, payloads);
  else if (mainInitialized) focusMainWindow();
  else shouldShowWindow = true;
}

function handleDeepLink(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    console.warn("Ignored malformed application deep link");
    return;
  }
  if (parsed.protocol !== `${PROTOCOL}:`) return;

  if (parsed.hostname === "auth" && parsed.pathname === "/redirect") {
    const code = parsed.searchParams.get("code");

    if (code) {
      deliverDeepLink("authCallback", { code });
    } else {
      const hashParams = new URLSearchParams(parsed.hash.slice(1));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
      const type = hashParams.get("type");
      if (!access_token || !refresh_token) {
        console.error("Auth callback missing one or more tokens");
        return;
      }
      deliverDeepLink("authCallback", {
        access_token,
        refresh_token,
        type,
      });
    }
  } else if (parsed.hostname === "checkout") {
    if (parsed.pathname !== "/success" && parsed.pathname !== "/cancel") return;
    const status = parsed.pathname === "/success" ? "success" : "cancel";
    deliverDeepLink("checkoutComplete", { status });
  }
}

if (ownsSingleInstanceLock) {
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  app.on("second-instance", (_event, argv) => {
    const deepLink = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (deepLink) handleDeepLink(deepLink);
    else openMainWindow();
  });

  for (const arg of process.argv) {
    if (arg.startsWith(`${PROTOCOL}://`)) handleDeepLink(arg);
  }
}

function isDeepLinkChannel(value: unknown): value is "authCallback" | "checkoutComplete" {
  return value === "authCallback" || value === "checkoutComplete";
}

ipcMain.on("deep-link:listener-ready", (event, channel: unknown) => {
  if (
    !ownsSingleInstanceLock ||
    event.sender !== mainWindow?.webContents ||
    !isDeepLinkChannel(channel)
  )
    return;
  sendDeepLinks(channel, deepLinkQueue.setReady(channel, true));
});

ipcMain.on("deep-link:listener-not-ready", (event, channel: unknown) => {
  if (
    !ownsSingleInstanceLock ||
    event.sender !== mainWindow?.webContents ||
    !isDeepLinkChannel(channel)
  )
    return;
  deepLinkQueue.setReady(channel, false);
});

function getWindow() {
  return mainWindow;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: translate("app.windowTitle"),
    width: 1280,
    height: 720,
    x: 150,
    y: 150,
    show: process.platform === "linux",
    icon: nativeImage.createFromPath(appIcon),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: "no-user-gesture-required",
    },
  });
  const window = mainWindow;

  window.once("ready-to-show", () => {
    createTray();
    if (!window.isDestroyed()) ttsManager?.setWebContents(window.webContents);
  });
  window.webContents.on("did-start-loading", () => {
    deepLinkQueue.resetForReload();
  });

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("close", (e) => {
    if (isQuitting) {
      mainWindow = null;
    } else if (process.platform === "linux") {
      isQuitting = true;
    } else {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    deepLinkQueue.resetForReload();
  });
}

function createTray() {
  const initialStatus: ConnectionStatus = "disconnected";
  try {
    tray = new Tray(getTrayImage(initialStatus));
    tray.setContextMenu(buildTrayMenu(initialStatus));
    tray.setToolTip(translate("app.trayTooltip"));
    tray.on("click", () => openMainWindow());
  } catch (error) {
    tray?.destroy();
    tray = null;
    if (mainInitialized) focusMainWindow();
    else shouldShowWindow = true;
    console.warn("System tray is unavailable; keeping the application window accessible", error);
  }
}

function getTrayImage(status: ConnectionStatus) {
  if (process.platform === "linux") {
    return getNativeImage(status === "connected" ? "icon-wake-256.png" : "icon-sleep-256.png");
  }
  return getNativeImage(status === "connected" ? "connected.ico" : "disconnected.ico");
}

function buildTrayMenu(status: ConnectionStatus) {
  return Menu.buildFromTemplate([
    { label: translate("common.changePreset"), click: () => openMainWindow() },
    ...(isLinuxUpdateDownloaded()
      ? [{ label: translate("settings.restartToUpdate"), click: () => void restartLinuxUpdate() }]
      : []),
    { type: "separator" },
    {
      label: translate("settings.disconnect"),
      enabled: status === "connected",
      click: () => ttsManager?.disconnect(),
    },
    {
      label: translate("settings.reconnect"),
      enabled: status === "disconnected",
      click: () => reconnect(),
    },
    { type: "separator" },
    {
      label: translate("common.exit"),
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function refreshUpdateActions() {
  if (process.platform === "linux") {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: translate("app.windowTitle"),
          submenu: [
            {
              label: translate("settings.restartToUpdate"),
              enabled: isLinuxUpdateDownloaded(),
              click: () => void restartLinuxUpdate(),
            },
            { type: "separator" },
            { label: translate("common.exit"), click: () => app.quit() },
          ],
        },
      ]),
    );
  }
  if (tray) tray.setContextMenu(buildTrayMenu(ttsManager?.getStatus() ?? "disconnected"));
}

function refreshNativeUi() {
  mainWindow?.setTitle(translate("app.windowTitle"));
  if (tray) {
    tray.setImage(getTrayImage(ttsManager?.getStatus() ?? "disconnected"));
    tray.setContextMenu(buildTrayMenu(ttsManager?.getStatus() ?? "disconnected"));
    tray.setToolTip(translate("app.trayTooltip"));
  }
  refreshUpdateActions();
}

function createTtsManager(): TtsManager {
  ttsManager = new TtsManager((status) => {
    if (tray) {
      tray.setImage(getTrayImage(status));
      tray.setContextMenu(buildTrayMenu(status));
    }
    pushConnectionChanged(getWindow, status);
  });
  return ttsManager;
}

function openMainWindow() {
  if (!mainInitialized) {
    shouldShowWindow = true;
    return;
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else {
    createMainWindow();
  }
}

async function reconnect() {
  const { getPort } = await import("./config");
  const { loadPresets, getActivePresetId } = await import("./presets");
  const port = await getPort();
  const presets = loadPresets();
  const activeId = getActivePresetId();
  const active = presets.find((p) => p.id === activeId) ?? presets.find((p) => p.id === "default");
  if (!active) {
    console.warn("Reconnect skipped: no presets available.");
    return;
  }
  ttsManager?.connect({ port, preset: active });
}

app.whenReady().then(async () => {
  if (!ownsSingleInstanceLock) return;
  await initializeMainI18n();
  bootstrap();

  initLogger(getWindow);
  console.log("xiv-megaphone started");

  if (process.platform === "win32") {
    try {
      const { updateElectronApp } = await import("update-electron-app");
      updateElectronApp();
    } catch (error) {
      console.error("Could not initialize Windows auto-updater", error);
    }
  }

  const startOnStartup = await getStartOnStartup();
  await setStartOnStartup(startOnStartup);

  const manager = createTtsManager();
  registerIpcHandlers(getWindow, manager, reconnect, refreshNativeUi, (authenticated) => {
    sendDeepLinks("authCallback", deepLinkQueue.setAuthenticated(authenticated));
  });

  if (!mainWindow) createMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) manager.setWebContents(mainWindow.webContents);

  if (process.platform === "linux" && app.isPackaged && process.env.APPIMAGE) {
    try {
      const { initializeLinuxUpdater } = await import("./linux-updater");
      const updater = await initializeLinuxUpdater({
        ownsSingleInstanceLock: () => ownsSingleInstanceLock,
        setOwnsSingleInstanceLock: (ownsLock) => {
          ownsSingleInstanceLock = ownsLock;
        },
        setQuitting: (quitting) => {
          isQuitting = quitting;
        },
        refreshUpdateActions,
        translate,
      });
      if (updater) {
        isLinuxUpdateDownloaded = updater.isDownloaded;
        restartLinuxUpdate = updater.restart;
        beforeQuitForUpdate = updater.beforeQuitForUpdate;
        stopLinuxUpdater = updater.stop;
        refreshUpdateActions();
      }
    } catch (error) {
      console.error("Could not initialize Linux auto-updater", error);
    }
  }

  mainInitialized = true;
  if (shouldShowWindow) {
    shouldShowWindow = false;
    focusMainWindow();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  stopLinuxUpdater();
});

app.on("window-all-closed", () => {
  if (process.platform === "linux") app.quit();
});
