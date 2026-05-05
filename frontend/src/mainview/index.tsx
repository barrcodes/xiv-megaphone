import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { PresetEditPage } from "./components/PresetEditPage";
import { PresetList } from "./components/PresetList";
import { SettingsPage } from "./components/SettingsPage";
import { App } from "./components/app";
import "./index.css";

const router = createHashRouter([
	{
		path: "/",
		element: <App />,
		children: [
			{ index: true, element: <PresetList /> },
			{ path: "preset/new", element: <PresetEditPage /> },
			{ path: "preset/:id", element: <PresetEditPage /> },
			{ path: "settings", element: <SettingsPage /> },
		],
	},
]);

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
