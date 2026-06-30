import { contextBridge, ipcRenderer } from "electron";
import type { ConnectionStatus, LogLine, Preset } from "../shared/types";

contextBridge.exposeInMainWorld("electronAPI", {
  authCallback: (cb: (data: { access_token: string; refresh_token: string; type?: string }) => void) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on("authCallback", handler);
    return () => ipcRenderer.removeListener("authCallback", handler);
  },
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
  onPresetsChanged: (cb: (presets: Preset[]) => void) => {
    const handler = (_, d) => cb(d);
    ipcRenderer.on("onPresetsChanged", handler);
    return () => ipcRenderer.removeListener("onPresetsChanged", handler);
  },
  onConnectionChanged: (cb: (status: ConnectionStatus) => void) => {
    const handler = (_, d) => cb(d);
    ipcRenderer.on("onConnectionChanged", handler);
    return () => ipcRenderer.removeListener("onConnectionChanged", handler);
  },
  onLogLine: (cb: (line: LogLine) => void) => {
    const handler = (_, d) => cb(d);
    ipcRenderer.on("onLogLine", handler);
    return () => ipcRenderer.removeListener("onLogLine", handler);
  },
  createStream: (
    cb: (payload: { streamId: string; backendUrl: string }) => void,
  ) => {
    const handler = (_, d) => cb(d);
    ipcRenderer.on("createStream", handler);
    return () => ipcRenderer.removeListener("createStream", handler);
  },
  cancelStream: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on("cancelStream", handler);
    return () => ipcRenderer.removeListener("cancelStream", handler);
  },
  setAuthState: (authenticated: boolean) =>
    ipcRenderer.invoke("setAuthState", authenticated),
  onCheckoutComplete: (
    cb: (data: { status: "success" | "cancel" }) => void,
  ) => {
    const handler = (_, d) => cb(d);
    ipcRenderer.on("checkoutComplete", handler);
    return () => ipcRenderer.removeListener("checkoutComplete", handler);
  },
  shellOpenExternal: (url: string) => ipcRenderer.invoke("shellOpenExternal", url),
  showPolicyDialog: () => ipcRenderer.invoke("policy:show-dialog"),
});
