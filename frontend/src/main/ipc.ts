import { app, type BrowserWindow, ipcMain, shell } from "electron";
import type { ConnectionStatus } from "../shared/types";
import {
  getPort,
  getStartOnStartup,
  getVolume,
  setPort,
  setStartOnStartup,
  setVolume,
} from "./config";
import {
  deletePreset,
  getActivePresetId,
  loadPresets,
  savePreset,
  setActivePresetId,
} from "./presets";
import type { TtsManager } from "./tts-manager";

let registered = false;

export function registerIpcHandlers(
  getWindow: () => BrowserWindow | null,
  ttsManager: TtsManager,
  reconnect: () => void,
) {
  if (registered) return;
  registered = true;

  ipcMain.handle("getPresets", () => loadPresets());
  ipcMain.handle("savePreset", (_, preset) => {
    savePreset(preset);
    if (preset.id === getActivePresetId()) {
      ttsManager.updatePreset(preset);
    }
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("onPresetsChanged", loadPresets());
    }
  });
  ipcMain.handle("deletePreset", (_, id) => {
    deletePreset(id);
    const presets = loadPresets();
    const activeId = getActivePresetId();
    const active = presets.find((p) => p.id === activeId);
    if (active) {
      ttsManager.updatePreset(active);
    }
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("onPresetsChanged", loadPresets());
    }
  });
  ipcMain.handle("setActivePreset", (_, id) => {
    setActivePresetId(id);
    const presets = loadPresets();
    const active = presets.find((p) => p.id === id);
    if (active) {
      ttsManager.updatePreset(active);
    }
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("onPresetsChanged", loadPresets());
    }
  });
  ipcMain.handle("getActivePreset", () => {
    const id = getActivePresetId();
    const presets = loadPresets();
    if (!presets.some((p) => p.id === id)) {
      setActivePresetId("default");
      return "default";
    }
    return id;
  });
  ipcMain.handle("getConnectionState", () => ({
    status: ttsManager.getStatus(),
  }));
  ipcMain.handle("reconnect", async () => {
    reconnect();
  });
  ipcMain.handle("disconnect", () => ttsManager.disconnect());
  ipcMain.handle("getPort", async () => ({ port: await getPort() }));
  ipcMain.handle("setPort", async (_, p) => {
    await setPort(p);
  });
  ipcMain.handle("getStartOnStartup", async () => ({
    enabled: await getStartOnStartup(),
  }));
  ipcMain.handle("setStartOnStartup", async (_, en) => setStartOnStartup(en));
  ipcMain.handle("getVolume", async () => ({ volume: await getVolume() }));
  ipcMain.handle("setVolume", async (_, v) => {
    await setVolume(v);
  });

  ipcMain.handle("setAuthState", async (_, authenticated: boolean) => {
    if (authenticated) {
      reconnect();
    } else {
      ttsManager.disconnect();
      getWindow()?.show();
    }
  });

  ipcMain.handle("policy:show-dialog", () => {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.focus();
      win.show();
    }
  });

  ipcMain.handle("shellOpenExternal", async (_, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle("app:get-version", () => app.getVersion());
}

export function pushConnectionChanged(
  getWindow: () => BrowserWindow | null,
  status: ConnectionStatus,
) {
  const win = getWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send("onConnectionChanged", status);
  }
}
