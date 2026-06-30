import { DEFAULT_PORT } from "../shared/defaults";
import type { ConnectionStatus } from "../shared/types";

type ConnectionChangeHandler = (status: ConnectionStatus) => void;

export class ConnectionManager {
  private status: ConnectionStatus = "disconnected";
  private presetId = "";
  private port = DEFAULT_PORT;
  private onChange: ConnectionChangeHandler;

  constructor(onChange: ConnectionChangeHandler) {
    this.onChange = onChange;
  }

  connect() {
    if (this.status === "connected" || this.status === "connecting") return;
    this.status = "connecting";
    this.onChange(this.status);
    setTimeout(() => {
      this.status = "connected";
      this.onChange(this.status);
    }, 1000);
  }

  disconnect() {
    if (this.status === "disconnected") return;
    this.status = "disconnected";
    this.onChange(this.status);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getPort(): number {
    return this.port;
  }

  setPort(port: number): void {
    this.port = port;
  }

  setPreset(id: string): void {
    this.presetId = id;
  }
}
