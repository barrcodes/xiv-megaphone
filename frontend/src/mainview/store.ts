import { DEFAULT_PORT } from "../shared/defaults";
import type { ConnectionStatus, LogLine, Preset } from "shared/types";
import { create } from "zustand";

interface AppStore {
  presets: Preset[];
  activePresetId: string;
  connectionStatus: ConnectionStatus;
  port: number;
  startOnStartup: boolean;
  apiKey: string;
  model: string;
  logs: LogLine[];
  setPresets: (presets: Preset[]) => void;
  setActivePresetId: (id: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setPort: (port: number) => void;
  setStartOnStartup: (enabled: boolean) => void;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  appendLog: (line: LogLine) => void;
}

export const useStore = create<AppStore>((set) => ({
  presets: [],
  activePresetId: "default",
  connectionStatus: "disconnected",
  port: DEFAULT_PORT,
  startOnStartup: false,
  apiKey: "",
  model: "inworld-tts-1.5-mini",
  logs: [],
  setPresets: (presets) => set({ presets }),
  setActivePresetId: (activePresetId) => set({ activePresetId }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setPort: (port) => set({ port }),
  setStartOnStartup: (startOnStartup) => set({ startOnStartup }),
  setApiKey: (apiKey) => set({ apiKey }),
  setModel: (model) => set({ model }),
  appendLog: (line) => set((state) => ({ logs: [...state.logs, line] })),
}));
