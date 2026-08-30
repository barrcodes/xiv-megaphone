import { LogOut, Power, RefreshCw, Rocket, Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-provider";
import { disconnect, reconnect, setPort, setStartOnStartup } from "@/lib/ipc";
import { supabase } from "@/lib/supabase";
import { useStore } from "../store";
import { LanguageSelector } from "./LanguageSelector";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";

export function SettingsPage() {
  const { t } = useTranslation();
  const {
    connectionStatus,
    port,
    setPort: storeSetPort,
    startOnStartup,
    setStartOnStartup: storeSetStartOnStartup,
  } = useStore();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  async function handlePortChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newPort = Number(e.target.value);
    if (!Number.isInteger(newPort) || newPort < 1 || newPort > 65535) return;
    storeSetPort(newPort);
    await setPort(newPort);
  }

  async function handleStartOnStartupChange(enabled: boolean) {
    storeSetStartOnStartup(enabled);
    await setStartOnStartup(enabled);
  }

  async function handleDisconnect() {
    await disconnect();
  }

  async function handleReconnect() {
    await reconnect();
  }

  async function handleRestart() {
    storeSetPort(port);
    await setPort(port);
    await reconnect();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    await signOut();
    navigate("/login");
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.description")}</p>
      </div>

      <Card className="animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="size-4 text-primary" />
            {t("settings.application")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t("common.language")}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.languageDescription")}
              </p>
            </div>
            <LanguageSelector />
          </div>

          <Separator className="bg-border/40" />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="startup-toggle" className="text-sm font-medium cursor-pointer">
                {t("settings.launchOnStartup")}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.launchOnStartupDescription")}
              </p>
            </div>
            <Switch
              id="startup-toggle"
              checked={startOnStartup}
              onCheckedChange={handleStartOnStartupChange}
            />
          </div>

          <Separator className="bg-border/40" />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="port-input" className="text-sm font-medium">
                {t("settings.connectionPort")}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.connectionPortDescription")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="port-input"
                type="number"
                value={port}
                onChange={handlePortChange}
                className="w-24 h-8 text-center"
                min={1}
                max={65535}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={connectionStatus === "connecting"}
                onClick={handleRestart}
              >
                <RefreshCw className="size-3.5" />
                {t("settings.restart")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="size-4 text-primary" />
            {t("settings.connection")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {connectionStatus === "connected"
                  ? t("settings.forceDisconnect")
                  : t("settings.reconnect")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {connectionStatus === "connected"
                  ? t("settings.disconnectDescription")
                  : t("settings.reconnectDescription")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={connectionStatus === "connecting"}
              onClick={connectionStatus === "connected" ? handleDisconnect : handleReconnect}
              className="gap-1.5"
            >
              {connectionStatus === "connected" ? (
                <>
                  <WifiOff className="size-3.5" /> {t("settings.disconnect")}
                </>
              ) : (
                <>
                  <RefreshCw className="size-3.5" /> {t("settings.reconnect")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="size-4 text-destructive" />
            {t("settings.account")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("settings.signOut")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.signOutDescription")}
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-1.5">
              <Power className="size-3.5" />
              {t("settings.logout")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
