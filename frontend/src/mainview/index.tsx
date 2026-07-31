import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { App } from "./components/app";
import { LogsPage } from "./components/LogsPage";
import { PresetEditPage } from "./components/PresetEditPage";
import { PresetList } from "./components/PresetList";
import { SettingsPage } from "./components/SettingsPage";
import { AuthProvider } from "./lib/auth-provider";
import "./index.css";
import { AccountPage } from "./components/AccountPage";
import { LoginPage } from "./components/LoginPage";
import { RequireAuth } from "./components/RequireAuth";
import { ResetPasswordPage } from "./components/ResetPasswordPage";
import { RequireDebug } from "./guards/RequireDebug";

const router = createHashRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: <App />,
        children: [
          { index: true, element: <PresetList /> },
          { path: "preset/:id", element: <PresetEditPage /> },
          { path: "settings", element: <SettingsPage /> },
          {
            element: <RequireDebug />,
            children: [{ path: "logs", element: <LogsPage /> }],
          },
          { path: "account", element: <AccountPage /> },
        ],
      },
    ],
  },
]);

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
