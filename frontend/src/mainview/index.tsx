import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { App } from "./components/app";
import { LogsPage } from "./components/LogsPage";
import { PresetEditPage } from "./components/PresetEditPage";
import { PresetList } from "./components/PresetList";
import { SettingsPage } from "./components/SettingsPage";
import { AudioService } from "./audio";
import "./index.css";

const audioService = new AudioService();
audioService.init().then(() => {
  window.electronAPI.onAudioStart(() => audioService.handleStart());
  window.electronAPI.onAudioChunk((chunk) => audioService.handleChunk(chunk));
  window.electronAPI.onAudioEnd(() => audioService.handleEnd());
  window.electronAPI.onAudioStop(() => audioService.handleStop());
});

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <PresetList /> },
      { path: "preset/:id", element: <PresetEditPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "logs", element: <LogsPage /> },
    ],
  },
]);

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
