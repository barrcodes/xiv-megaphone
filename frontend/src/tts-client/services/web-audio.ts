import type { WebContents } from "electron";
import type { CreateStreamRequest } from "../../shared/models";

export class WebAudioPlayer {
  supportsStreaming = true;
  private webContents: WebContents;

  constructor(webContents: WebContents) {
    this.webContents = webContents;
  }

  async createStream(request: CreateStreamRequest): Promise<void> {
    if (!this.webContents.isDestroyed()) {
      this.webContents.send("createStream", request);
    }
  }

  stop(): void {
    if (!this.webContents.isDestroyed()) {
      this.webContents.send("cancelStream");
    }
  }
}
