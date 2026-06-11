import { TtsSocket } from "../tts-client/index";
import type { WebContents } from "electron";
import type { ConnectionStatus, Preset } from "../shared/types";
import { ConfigurablePreset } from "../tts-client/presets/configurable";

type ConnectionChangeHandler = (status: ConnectionStatus) => void;

export class TtsManager {
  private socket: TtsSocket | null = null;
  private status: ConnectionStatus = "disconnected";
  private onChange: ConnectionChangeHandler;
  private currentPreset: Preset | null = null;
  private currentPort = 0;
  private webContents: WebContents | null = null;

  constructor(onChange: ConnectionChangeHandler) {
    this.onChange = onChange;
  }

  setWebContents(wc: WebContents) {
    this.webContents = wc;
  }

  connect(opts: {
    port: number;
    preset: Preset;
  }) {
    if (this.status === "connected" || this.status === "connecting") return;
    this.status = "connecting";
    this.onChange(this.status);

    this.currentPreset = opts.preset;
    this.currentPort = opts.port;
    const basePreset = new ConfigurablePreset(opts.preset);
    this.socket = new TtsSocket({
      port: opts.port,
      preset: basePreset,
      webContents: this.webContents!,
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
}