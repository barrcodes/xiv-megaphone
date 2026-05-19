import { TtsSocket } from "../tts-client/index";
import type { ConnectionStatus, Preset } from "../shared/types";
import { ConfigurablePreset } from "../tts-client/presets/configurable";

type ConnectionChangeHandler = (status: ConnectionStatus) => void;

export class TtsManager {
  private socket: TtsSocket | null = null;
  private status: ConnectionStatus = "disconnected";
  private onChange: ConnectionChangeHandler;
  private currentPreset: Preset | null = null;
  private currentPort = 0;
  private currentApiKey = "";
  private currentModel = "";

  constructor(onChange: ConnectionChangeHandler) {
    this.onChange = onChange;
  }

  connect(opts: {
    port: number;
    preset: Preset;
    apiKey: string;
    model?: string;
  }) {
    if (this.status === "connected" || this.status === "connecting") return;
    this.status = "connecting";
    this.onChange(this.status);

    this.currentPreset = opts.preset;
    this.currentPort = opts.port;
    this.currentApiKey = opts.apiKey;
    this.currentModel = opts.model ?? "inworld-tts-1.5-mini";
    const basePreset = new ConfigurablePreset(opts.preset);
    this.socket = new TtsSocket({
      port: opts.port,
      preset: basePreset,
      apiKey: opts.apiKey,
      model: opts.model,
      onConnected: () => {
        this.status = "connected";
        this.onChange(this.status);
      },
      onDisconnected: () => {
        if (this.status !== "disconnected") {
          this.status = "disconnected";
          this.onChange(this.status);
        }
      },
    });
  }

  disconnect() {
    if (this.status === "disconnected") return;
    this.socket?.disconnect();
    this.socket = null;
    this.status = "disconnected";
    this.onChange(this.status);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  updatePreset(preset: Preset) {
    if (!this.socket) return;
    this.currentPreset = preset;
    const basePreset = new ConfigurablePreset(preset);
    this.socket.updatePreset(basePreset);
  }

  updatePort(port: number, apiKey: string, model?: string) {
    const preset = this.currentPreset;
    const key = apiKey || this.currentApiKey;
    const mod = model ?? this.currentModel;
    this.disconnect();
    if (preset && key) {
      this.connect({ port, preset, apiKey: key, model: mod });
    }
  }

  updateApiKey(apiKey: string) {
    this.currentApiKey = apiKey;
    this.socket?.updateApiKey(apiKey);
  }

  updateModel(model: string) {
    this.currentModel = model;
  }
}
