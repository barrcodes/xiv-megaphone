import WebSocket from "ws";

export abstract class SocketManager {
  private ws: WebSocket | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private connected = false;
  private destroyed = false;
  protected onOpen: (() => void) | null = null;
  protected onClose: (() => void) | null = null;

  constructor(protected readonly url: string) {
    this.connect();
  }

  connect() {
    if (this.destroyed) return;
    if (this.ws) return;
    this.ws = new WebSocket(this.url);
    this.ws.on("open", () => {
      this.connected = true;
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
      if (this.connected) {
        console.log(`Disconnected from WebSocket at ${this.url}`);
      }
      this.connected = false;
      this._onClose();
      this.ws = null;
      if (this.onClose) this.onClose();
      if (!this.destroyed) {
        this.reconnect();
      }
    });
    this.ws.on("error", () => {
      // Reconnection is scheduled by the close handler.
    });
  }

  disconnect() {
    this.destroyed = true;
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
    if (this.reconnectInterval) clearInterval(this.reconnectInterval);
    this.reconnectInterval = setInterval(() => {
      this.connect();
    }, 5000);
  }
}
