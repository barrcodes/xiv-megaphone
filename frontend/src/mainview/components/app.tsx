import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import {
	getActivePreset,
	getConnectionState,
	getPort,
	getPresets,
	getStartOnStartup,
} from "@/lib/ipc";
import { useStore } from "../store";
import { AppHeader } from "./AppHeader";

export function App() {
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
		<div className="h-full flex flex-col overflow-hidden bg-background text-foreground">
			<AppHeader />
			<div className="flex-1 overflow-y-auto">
				<Outlet />
			</div>
		</div>
	);
}
