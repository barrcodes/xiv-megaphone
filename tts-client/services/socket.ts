import WebSocket from "ws";

export abstract class SocketManager {
  protected abstract url: string;
  private ws: WebSocket | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    console.log(`Connecting to WebSocket at ${this.url}...`);
    this.ws = new WebSocket(this.url);
    this.ws.on("open", () => {
      console.log(`Connected to WebSocket at ${this.url}`);
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
      this._onOpen();
    });
    this.ws.on("message", (data) => {
      this._onMessage(data);
    });
    this.ws.on("close", () => {
      this._onClose();
      console.log(`Disconnected from WebSocket at ${this.url}`);
      this.ws = null;
      this.reconnect();
    });
    this.ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
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
