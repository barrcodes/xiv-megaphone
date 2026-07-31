import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import {
  getActivePreset,
  getConnectionState,
  getPort,
  getPresets,
  getStartOnStartup,
} from "@/lib/ipc";
import { queryClient } from "@/lib/query-client";
import { AudioPlayer } from "../audio/audio-player";
import { useRefreshBalanceOnStream } from "../queries/useRefreshBalanceOnStream";
import { useStore } from "../store";
import { initTelemetry } from "../telemetry";
import { Sidebar } from "./Sidebar";
import { TooltipProvider } from "./ui/tooltip";

export const App: React.FC = () => {
  const { setPresets, setActivePresetId, setConnectionStatus, setPort, setStartOnStartup } =
    useStore();

  useRefreshBalanceOnStream();

  useEffect(() => {
    initTelemetry();
    Promise.all([
      getPresets(),
      getActivePreset(),
      getConnectionState(),
      getPort(),
      getStartOnStartup(),
    ]).then(([localPresets, activePresetId, connectionState, portResult, startupResult]) => {
      setPresets(localPresets);
      setActivePresetId(activePresetId);
      setConnectionStatus(connectionState.status);
      setPort(portResult.port);
      setStartOnStartup(startupResult.enabled);
    });
  }, [setPresets, setActivePresetId, setConnectionStatus, setPort, setStartOnStartup]);

  return (
    <TooltipProvider>
      <QueryClientProvider client={queryClient}>
        <div className="flex h-full overflow-hidden mesh-bg text-foreground">
          <AudioPlayer />
          <Sidebar />
          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </QueryClientProvider>
    </TooltipProvider>
  );
};
