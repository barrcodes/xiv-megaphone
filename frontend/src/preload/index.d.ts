import { CreateStreamRequest } from "../shared/models";
import type { ConnectionStatus, LogLine, Preset } from "../shared/types";

declare global {
  interface Window {
    electronAPI: {
      authCallback(
        cb: (
          data: { code: string } | { access_token: string; refresh_token: string; type?: string },
        ) => void,
      ): () => void;
      getPresets(): Promise<Preset[]>;
      savePreset(preset: Preset): Promise<void>;
      deletePreset(id: string): Promise<void>;
      setActivePreset(id: string): Promise<void>;
      getActivePreset(): Promise<string>;
      getConnectionState(): Promise<{ status: ConnectionStatus }>;
      reconnect(): Promise<void>;
      disconnect(): Promise<void>;
      getPort(): Promise<{ port: number }>;
      setPort(port: number): Promise<void>;
      getStartOnStartup(): Promise<{ enabled: boolean }>;
      setStartOnStartup(enabled: boolean): Promise<void>;
      getVolume(): Promise<{ volume: number }>;
      setVolume(volume: number): Promise<void>;
      onPresetsChanged(cb: (presets: Preset[]) => void): () => void;
      onConnectionChanged(cb: (status: ConnectionStatus) => void): () => void;
      onLogLine(cb: (line: LogLine) => void): () => void;
      getApiKey(): Promise<{ apiKey: string }>;
      setApiKey(key: string): Promise<void>;
      getModel(): Promise<{ model: string }>;
      setModel(model: string): Promise<void>;
      getUseLocalBackend(): Promise<{ enabled: boolean }>;
      setUseLocalBackend(enabled: boolean): Promise<void>;
      getBackendUrl(): Promise<{ url: string }>;
      createStream(cb: (payload: CreateStreamRequest) => void): () => void;
      cancelStream(cb: () => void): () => void;
      setAuthState(authenticated: boolean): Promise<void>;
      onCheckoutComplete(cb: (data: { status: "success" | "cancel" }) => void): () => void;
      getVersion(): Promise<string>;
      showPolicyDialog(): Promise<void>;
      shellOpenExternal(url: string): Promise<void>;
    };
  }
}
