import { type PropsWithChildren, useEffect } from "react";
import { Outlet } from "react-router-dom";
import {
	getActivePreset,
	getConnectionState,
	getPort,
	getPresets,
	getStartOnStartup,
} from "@/lib/ipc";
import { AudioPlayer } from "../audio/audio-player";
import { useStore } from "../store";
import { Sidebar } from "./Sidebar";
import { TooltipProvider } from "./ui/tooltip";

export const App: React.FC<PropsWithChildren> = () => {
	const { setPresets, setActivePresetId, setConnectionStatus, setPort, setStartOnStartup } =
		useStore();

	useEffect(() => {
		Promise.all([
			getPresets(),
			getActivePreset(),
			getConnectionState(),
			getPort(),
			getStartOnStartup(),
		]).then(([presets, activePresetId, connectionState, portResult, startupResult]) => {
			setPresets(presets);
			setActivePresetId(activePresetId);
			setConnectionStatus(connectionState.status);
			setPort(portResult.port);
			setStartOnStartup(startupResult.enabled);
		});
	}, [setPresets, setActivePresetId, setConnectionStatus, setPort, setStartOnStartup]);

	return (
		<TooltipProvider>
			<div className="flex h-full overflow-hidden mesh-bg text-foreground">
				<AudioPlayer />
				<Sidebar />
				<div className="flex-1 overflow-y-auto">
					<Outlet />
				</div>
			</div>
		</TooltipProvider>
	);
};
