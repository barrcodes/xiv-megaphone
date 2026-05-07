import WebSocket from "ws";

export abstract class SocketManager {
  private ws: WebSocket | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private _destroyed = false;
  protected onOpen: (() => void) | null = null;
  protected onClose: (() => void) | null = null;

  constructor(protected readonly url: string) {
    this.connect();
  }

  connect() {
    if (this._destroyed) return;
    console.log(`Connecting to WebSocket at ${this.url}...`);
    this.ws = new WebSocket(this.url);
    this.ws.on("open", () => {
      console.log(`Connected to WebSocket at ${this.url}`);
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
      this._onOpen();
      if (this.onOpen) this.onOpen();
    });
    this.ws.on("message", (data) => {
      this._onMessage(data);
    });
    this.ws.on("close", () => {
      this._onClose();
      console.log(`Disconnected from WebSocket at ${this.url}`);
      this.ws = null;
      if (this.onClose) this.onClose();
      if (!this._destroyed) {
        this.reconnect();
      }
    });
    this.ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  }

  disconnect() {
    this._destroyed = true;
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }

  protected abstract _onOpen(): void;
  protected abstract _onMessage(data: WebSocket.Data): void;
  protected abstract _onClose(): void;

  private reconnect() {
    this.reconnectInterval = setInterval(() => {
      console.log(`Reconnecting to WebSocket at ${this.url}`);
      this.connect();
    }, 5000);
  }
}