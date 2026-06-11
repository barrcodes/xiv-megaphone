import path, { join } from "node:path";
import { app, BrowserWindow, Menu, nativeImage, Tray } from "electron";
import type { ConnectionStatus } from "../shared/types";
import appIcon from "../../art-assets/icon-cait-sith-wake-256.png?asset";
import { getNativeImage } from "./utils/resources";
import { getPort, getStartOnStartup, setStartOnStartup } from "./config";
import { pushConnectionChanged, registerIpcHandlers } from "./ipc";
import { initLogger } from "./logger";
import { bootstrap } from "./presets";
import { TtsManager } from "./tts-manager";
import SquirrelStartup from "electron-squirrel-startup";
import { updateElectronApp } from "update-electron-app";

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
}

updateElectronApp();

if (SquirrelStartup) {
  process.exit(0);
}

const PROTOCOL = "xiv-megaphone";

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let ttsManager: TtsManager | null = null;
let isQuitting = false;

function handleDeepLink(url: string) {
  console.log("Deep link received:", url);
  if (!mainWindow) return;

  const parsed = new URL(url);

  if (parsed.hostname === "auth" && parsed.pathname === "/callback") {
    const hashParams = new URLSearchParams(parsed.hash.slice(1));
    const access_token = hashParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token");
    if (!access_token || !refresh_token) {
      console.error("Auth callback missing one or more tokens");
      return;
    }
    mainWindow.webContents.send("authCallback", {
      access_token,
      refresh_token,
    });
    mainWindow.focus();
  } else if (parsed.hostname === "checkout") {
    const status = parsed.pathname === "/success" ? "success" : "cancel";
    mainWindow.webContents.send("checkoutComplete", { status });
    mainWindow.focus();
  }
}

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

app.on("second-instance", (event, argv) => {
  // Windows / Linux sometimes pass deep links as argv
  const deepLink = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (deepLink) {
    handleDeepLink(deepLink);
  }
});

function getWindow() {
  return mainWindow;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: "Preset Editor",
    width: 800,
    height: 600,
    x: 150,
    y: 150,
    show: false,
    icon: nativeImage.createFromPath(appIcon),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: "no-user-gesture-required",
    },
  });

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("close", (e) => {
    if (isQuitting) {
      mainWindow = null;
    } else {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray() {
  const initialStatus: ConnectionStatus = "disconnected";
  tray = new Tray(getTrayImage(initialStatus));
  tray.setContextMenu(buildTrayMenu(initialStatus));
  tray.setToolTip("xiv-megaphone");
  tray.on("click", () => openMainWindow());
}

function getTrayImage(status: ConnectionStatus) {
  return getNativeImage(
    status === "connected" ? "connected.ico" : "disconnected.ico",
  );
}

function buildTrayMenu(status: ConnectionStatus) {
  return Menu.buildFromTemplate([
    { label: "Change Preset", click: () => openMainWindow() },
    { type: "separator" },
    {
      label: "Disconnect",
      enabled: status === "connected",
      click: () => ttsManager?.disconnect(),
    },
    {
      label: "Reconnect",
      enabled: status === "disconnected",
      click: () => reconnect(),
    },
    { type: "separator" },
    {
      label: "Exit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function createTtsManager() {
  ttsManager = new TtsManager((status) => {
    if (tray) {
      tray.setImage(
        getNativeImage(
          status === "connected" ? "connected.ico" : "disconnected.ico",
        ),
      );
      tray.setContextMenu(buildTrayMenu(status));
    }
    pushConnectionChanged(getWindow, status);
  });
}

function openMainWindow() {
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
  const active = presets.find((p) => p.id === activeId);
  if (!active) {
    console.warn("Reconnect skipped: no active preset configured.");
    return;
  }
  ttsManager?.connect({ port, preset: active });
}

app
  .whenReady()
  .then(async () => {
    bootstrap();

    initLogger(getWindow);
    console.log("xiv-megaphone started");

    const startOnStartup = await getStartOnStartup();
    await setStartOnStartup(startOnStartup);

    createMainWindow();

    mainWindow?.on("ready-to-show", () => {
      createTray();
      createTtsManager();
      ttsManager!.setWebContents(mainWindow!.webContents);
      registerIpcHandlers(getWindow, ttsManager!, reconnect);
    });
  })
  .catch((err) => {
    console.error("Failed to start:", err);
    app.quit();
  });

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  // Prevent app from quitting when all windows are closed
});
