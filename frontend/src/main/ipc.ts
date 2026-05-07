import { type BrowserWindow, ipcMain } from "electron";
import type { ConnectionStatus } from "../shared/types";
import {
  getApiKey,
  getModel,
  getPort,
  getStartOnStartup,
  setApiKey,
  setModel,
  setPort,
  setStartOnStartup,
} from "./config";
import {
  deletePreset,
  getActivePresetId,
  loadPresets,
  savePreset,
  setActivePresetId,
} from "./presets";
import type { TtsManager } from "./tts-manager";

export function registerIpcHandlers(
  getWindow: () => BrowserWindow | null,
  ttsManager: TtsManager
) {
  ipcMain.handle("getPresets", () => loadPresets());
  ipcMain.handle("savePreset", async (_, preset) => {
    savePreset(preset);
    if (preset.id === getActivePresetId()) {
      ttsManager.updatePreset(preset);
    }
  });
  ipcMain.handle("deletePreset", async (_, id) => {
    deletePreset(id);
  });
  ipcMain.handle("setActivePreset", async (_, id) => {
    setActivePresetId(id);
    const presets = loadPresets();
    const active = presets.find((p) => p.id === id);
    if (active) {
      ttsManager.updatePreset(active);
    }
  });
  ipcMain.handle("getActivePreset", () => getActivePresetId());
  ipcMain.handle("getConnectionState", () => ({
    status: ttsManager.getStatus(),
  }));
  ipcMain.handle("reconnect", async () => {
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
  });
  ipcMain.handle("disconnect", () => ttsManager.disconnect());
  ipcMain.handle("getPort", async () => ({ port: await getPort() }));
  ipcMain.handle("setPort", async (_, p) => {
    await setPort(p);
    const presets = loadPresets();
    const activeId = getActivePresetId();
    const active = presets.find((pr) => pr.id === activeId);
    if (active) {
      ttsManager.updatePort(p, await getApiKey(), await getModel());
    }
  });
  ipcMain.handle("getStartOnStartup", async () => ({
    enabled: await getStartOnStartup(),
  }));
  ipcMain.handle("setStartOnStartup", async (_, en) => setStartOnStartup(en));
  ipcMain.handle("getApiKey", async () => ({ apiKey: await getApiKey() }));
  ipcMain.handle("setApiKey", async (_, key) => {
    await setApiKey(key);
    ttsManager.updateApiKey(key);
  });
  ipcMain.handle("getModel", async () => ({ model: await getModel() }));
  ipcMain.handle("setModel", async (_, m) => {
    await setModel(m);
    ttsManager.updateModel(m);
  });
}

export function pushConnectionChanged(
  getWindow: () => BrowserWindow | null,
  status: ConnectionStatus
) {
  const win = getWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send("onConnectionChanged", status);
  }
}
