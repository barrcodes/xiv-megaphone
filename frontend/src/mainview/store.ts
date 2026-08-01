import { create } from "zustand";
import { DEFAULT_PORT } from "../shared/defaults";
import type { ConnectionStatus, LogLine, Preset } from "../shared/types";

interface AppStore {
  presets: Preset[];
  activePresetId: string;
  connectionStatus: ConnectionStatus;
  port: number;
  startOnStartup: boolean;
  logs: LogLine[];
  volume: number;
  muted: boolean;
  setPresets: (presets: Preset[]) => void;
  setActivePresetId: (id: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setPort: (port: number) => void;
  setStartOnStartup: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  appendLog: (line: LogLine) => void;
}

export const useStore = create<AppStore>((set) => ({
  presets: [],
  activePresetId: "default",
  connectionStatus: "disconnected",
  port: DEFAULT_PORT,
  startOnStartup: false,
  logs: [],
  volume: 1.0,
  muted: false,
  setPresets: (presets) => set({ presets }),
  setActivePresetId: (activePresetId) => set({ activePresetId }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setPort: (port) => set({ port }),
  setStartOnStartup: (startOnStartup) => set({ startOnStartup }),
  setVolume: (volume) => set({ volume }),
  setMuted: (muted) => set({ muted }),
  appendLog: (line) => set((state) => ({ logs: [...state.logs, line] })),
}));
