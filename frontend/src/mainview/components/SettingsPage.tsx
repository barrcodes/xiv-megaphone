import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  disconnect,
  getApiKey,
  getModel,
  reconnect,
  setApiKey,
  setModel,
  setPort,
  setStartOnStartup,
} from "@/lib/ipc";
import { useStore } from "../store";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

export function SettingsPage() {
  const {
    connectionStatus,
    port,
    setPort: storeSetPort,
    startOnStartup,
    setStartOnStartup: storeSetStartOnStartup,
    apiKey,
    setApiKey: storeSetApiKey,
    model,
    setModel: storeSetModel,
  } = useStore();
  const navigate = useNavigate();
  const [localApiKey, setLocalApiKey] = useState("");
  const [localModel, setLocalModel] = useState("");

  useEffect(() => {
    getApiKey().then((r) => {
      storeSetApiKey(r.apiKey);
      setLocalApiKey(r.apiKey);
    });
    getModel().then((r) => {
      storeSetModel(r.model);
      setLocalModel(r.model);
    });
  }, []);

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

  async function handleReconnect() {
    await reconnect();
  }

  async function handleDisconnect() {
    await disconnect();
  }

  async function handleApplyCredentials() {
    storeSetApiKey(localApiKey);
    storeSetModel(localModel);
    await setApiKey(localApiKey);
    await setModel(localModel);
    await reconnect();
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ArrowLeftIcon
          className="cursor-pointer"
          onClick={() => navigate("/")}
        />
        <h2 className="text-lg font-semibold mb-0 align-middle">Settings</h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Switch
            id="startup-toggle"
            checked={startOnStartup}
            onCheckedChange={handleStartOnStartupChange}
          />
          <Label
            htmlFor="startup-toggle"
            className="text-sm cursor-pointer whitespace-nowrap"
          >
            Launch on startup
          </Label>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="port-input" className="text-sm whitespace-nowrap">
              Port
            </Label>
            <Input
              id="port-input"
              type="number"
              value={port}
              onChange={handlePortChange}
              className="w-24 h-8"
              min={1}
              max={65535}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="apikey-input" className="text-sm whitespace-nowrap">
            Inworld API Key
          </Label>
          <Input
            id="apikey-input"
            type="password"
            value={localApiKey}
            onChange={(e) => setLocalApiKey(e.target.value)}
            className="h-8"
            placeholder="iw_api_..."
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="model-input" className="text-sm whitespace-nowrap">
            Model
          </Label>
          <Input
            id="model-input"
            type="text"
            value={localModel}
            onChange={(e) => setLocalModel(e.target.value)}
            className="h-8"
          />
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={handleApplyCredentials}>
            Apply & Reconnect
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={connectionStatus !== "connected"}
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}
