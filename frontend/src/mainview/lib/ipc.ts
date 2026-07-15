import type { ConnectionStatus, LogLine, Preset } from "shared/types";
import { useStore } from "../store";

const api = window.electronAPI;

let cachedDefault: Preset | null = null;

async function ensureDefaultPreset(): Promise<Preset | null> {
  if (cachedDefault) return cachedDefault;
  try {
    const { getDefaultPreset } = await import("../api");
    cachedDefault = await getDefaultPreset();
    return cachedDefault;
  } catch {
    return null;
  }
}

function mergePresets(localPresets: Preset[], defaultPreset: Preset | null): Preset[] {
  if (!defaultPreset) return localPresets;
  return [defaultPreset, ...localPresets.filter((p) => p.id !== "default")];
}

export const authCallback = (
  cb: (tokens: { access_token: string; refresh_token: string }) => void,
) => api.authCallback(cb);
export const getPresets = (): Promise<Preset[]> => api.getPresets();
export const savePreset = (p: Preset): Promise<void> => api.savePreset(p);
export const deletePreset = (id: string): Promise<void> => api.deletePreset(id);
export const setActivePreset = (id: string): Promise<void> =>
  api.setActivePreset(id);
export const getActivePreset = (): Promise<string> => api.getActivePreset();
export const getConnectionState = (): Promise<{ status: ConnectionStatus }> =>
  api.getConnectionState();
export const reconnect = (): Promise<void> => api.reconnect();
export const disconnect = (): Promise<void> => api.disconnect();
export const getPort = (): Promise<{ port: number }> => api.getPort();
export const setPort = (port: number): Promise<void> => api.setPort(port);
export const getStartOnStartup = (): Promise<{ enabled: boolean }> =>
  api.getStartOnStartup();
export const setStartOnStartup = (en: boolean): Promise<void> =>
  api.setStartOnStartup(en);
export const getApiKey = (): Promise<{ apiKey: string }> => api.getApiKey();
export const setApiKey = (key: string): Promise<void> => api.setApiKey(key);
export const getModel = (): Promise<{ model: string }> => api.getModel();
export const setModel = (model: string): Promise<void> => api.setModel(model);
export const getUseLocalBackend = (): Promise<{ enabled: boolean }> =>
  api.getUseLocalBackend();
export const setUseLocalBackend = (en: boolean): Promise<void> =>
  api.setUseLocalBackend(en);

api.onPresetsChanged(async (localPresets) => {
  const defaultPreset = await ensureDefaultPreset();
  useStore.getState().setPresets(mergePresets(localPresets, defaultPreset));
});
api.onConnectionChanged((status) =>
  useStore.getState().setConnectionStatus(status),
);
api.onLogLine((line) => useStore.getState().appendLog(line));
