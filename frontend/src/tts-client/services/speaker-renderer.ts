import type { WebContents } from "electron";
import { AudioPlayer } from "./audio-player";
import type { CreateStreamRequest } from "../../shared/models";

export class SpeakerRendererPlayer extends AudioPlayer {
  supportsStreaming = true;
  private webContents: WebContents;

  constructor(webContents: WebContents) {
    super();
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
