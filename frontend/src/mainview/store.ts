import { DEFAULT_PORT } from "shared/defaults";
import type { ConnectionStatus, Preset } from "shared/types";
import { create } from "zustand";

interface AppStore {
	presets: Preset[];
	activePresetId: string;
	connectionStatus: ConnectionStatus;
	port: number;
	startOnStartup: boolean;
	setPresets: (presets: Preset[]) => void;
	setActivePresetId: (id: string) => void;
	setConnectionStatus: (status: ConnectionStatus) => void;
	setPort: (port: number) => void;
	setStartOnStartup: (enabled: boolean) => void;
}

export const useStore = create<AppStore>((set) => ({
	presets: [],
	activePresetId: "default",
	connectionStatus: "disconnected",
	port: DEFAULT_PORT,
	startOnStartup: false,
	setPresets: (presets) => set({ presets }),
	setActivePresetId: (activePresetId) => set({ activePresetId }),
	setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
	setPort: (port) => set({ port }),
	setStartOnStartup: (startOnStartup) => set({ startOnStartup }),
}));
