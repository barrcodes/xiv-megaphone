import { contextBridge, ipcRenderer } from "electron";
import type { ConnectionStatus, LogLine, Preset } from "../shared/types";

contextBridge.exposeInMainWorld("electronAPI", {
  getPresets: () => ipcRenderer.invoke("getPresets"),
  savePreset: (preset: Preset) => ipcRenderer.invoke("savePreset", preset),
  deletePreset: (id: string) => ipcRenderer.invoke("deletePreset", id),
  setActivePreset: (id: string) => ipcRenderer.invoke("setActivePreset", id),
  getActivePreset: () => ipcRenderer.invoke("getActivePreset"),
  getConnectionState: () => ipcRenderer.invoke("getConnectionState"),
  reconnect: () => ipcRenderer.invoke("reconnect"),
  disconnect: () => ipcRenderer.invoke("disconnect"),
  getPort: () => ipcRenderer.invoke("getPort"),
  setPort: (port: number) => ipcRenderer.invoke("setPort", port),
  getStartOnStartup: () => ipcRenderer.invoke("getStartOnStartup"),
  setStartOnStartup: (enabled: boolean) =>
    ipcRenderer.invoke("setStartOnStartup", enabled),
  onPresetsChanged: (cb: (presets: Preset[]) => void) =>
    ipcRenderer.on("onPresetsChanged", (_, d) => cb(d)),
  onConnectionChanged: (cb: (status: ConnectionStatus) => void) =>
    ipcRenderer.on("onConnectionChanged", (_, d) => cb(d)),
  onLogLine: (cb: (line: LogLine) => void) =>
    ipcRenderer.on("onLogLine", (_, d) => cb(d)),
  getApiKey: () => ipcRenderer.invoke("getApiKey"),
  setApiKey: (key: string) => ipcRenderer.invoke("setApiKey", key),
  getModel: () => ipcRenderer.invoke("getModel"),
  setModel: (model: string) => ipcRenderer.invoke("setModel", model),
});
