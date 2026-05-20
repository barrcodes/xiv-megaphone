import { join } from "node:path";
import { app, BrowserWindow, Menu, nativeImage, Tray } from "electron";
import type { ConnectionStatus } from "../shared/types";
import appIcon from "../../art-assets/icon-cait-sith-wake-256.png?asset";
import { getNativeImage } from "./utils/resources";
import {
  getApiKey,
  getModel,
  getStartOnStartup,
  setStartOnStartup,
} from "./config";
import { pushConnectionChanged, registerIpcHandlers } from "./ipc";
import { initLogger } from "./logger";
import { bootstrap } from "./presets";
import { TtsManager } from "./tts-manager";
import SquirrelStartup from "electron-squirrel-startup";
import { updateElectronApp } from "update-electron-app";

updateElectronApp();

if (SquirrelStartup) {
  process.exit(0);
}

let presetWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function getWindow() {
  return presetWindow;
}

function createPresetWindow() {
  presetWindow = new BrowserWindow({
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
    presetWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    presetWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  presetWindow.on("close", (e) => {
    if (isQuitting) {
      presetWindow = null;
    } else {
      e.preventDefault();
      presetWindow?.hide();
    }
  });

  presetWindow.on("closed", () => {
    presetWindow = null;
  });
}

function buildTrayMenu(status: ConnectionStatus) {
  return Menu.buildFromTemplate([
    { label: "Change Preset", click: () => openPresetEditor() },
    { type: "separator" },
    {
      label: "Disconnect",
      enabled: status === "connected",
      click: () => ttsManager.disconnect(),
    },
    {
      label: "Reconnect",
      enabled: status === "disconnected",
      click: () => reconnect(),
    },
    { type: "separator" },
    { label: "Exit", click: () => { isQuitting = true; app.quit(); } },
  ]);
}

const ttsManager = new TtsManager((status) => {
  if (tray) {
    tray.setImage(
      getNativeImage(
        status === "connected" ? "connected.ico" : "disconnected.ico"
      )
    );
    tray.setContextMenu(buildTrayMenu(status));
  }
  pushConnectionChanged(getWindow, status);
});

function openPresetEditor() {
  if (presetWindow) {
    if (presetWindow.isMinimized()) presetWindow.restore();
    presetWindow.show();
  } else {
    createPresetWindow();
  }
}

async function reconnect() {
  const { getPort, getApiKey, getModel } = await import("./config");
  const { loadPresets, getActivePresetId } = await import("./presets");
  const port = await getPort();
  const apiKey = await getApiKey();
  const model = await getModel();
  const presets = loadPresets();
  const activeId = getActivePresetId();
  const active = presets.find((p) => p.id === activeId);
  if (!active) {
    console.warn("Reconnect skipped: no active preset configured.");
    return;
  }
  if (!apiKey) {
    console.warn("Reconnect skipped: no API key set.");
    return;
  }
  ttsManager.connect({ port, preset: active, apiKey, model });
}

app
  .whenReady()
  .then(async () => {
    bootstrap();

    initLogger(getWindow);
    console.log("xiv-megaphone started");

    createPresetWindow();
    ttsManager.setWebContents(presetWindow!.webContents);

    const startOnStartup = await getStartOnStartup();
    await setStartOnStartup(startOnStartup);

    const apiKey = await getApiKey();
    const model = await getModel();
    registerIpcHandlers(getWindow, ttsManager);

    const port = await (await import("./config")).getPort();
    const presets = (await import("./presets")).loadPresets();
    const activeId = (await import("./presets")).getActivePresetId();
    const active = presets.find((p) => p.id === activeId);

    if (active && apiKey) {
      ttsManager.connect({ port, preset: active, apiKey, model });
    }

    tray = new Tray(getNativeImage("disconnected.ico"));
    tray.setToolTip("xiv-megaphone");
    tray.setContextMenu(buildTrayMenu(ttsManager.getStatus()));

    tray.on("click", () => openPresetEditor());
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
