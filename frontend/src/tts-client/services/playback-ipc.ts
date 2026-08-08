import type { WebContents } from "electron";
import type { CancelScopePayload, DialogueEvent, PlaybackRequest } from "../../shared/playback";

export class PlaybackIpc {
  private webContents: WebContents;

  constructor(webContents: WebContents) {
    this.webContents = webContents;
  }

  createStream(request: PlaybackRequest): void {
    if (!this.webContents.isDestroyed()) {
      this.webContents.send("createStream", request);
    }
  }

  cancel(payload: CancelScopePayload): void {
    if (!this.webContents.isDestroyed()) {
      this.webContents.send("cancelStream", payload);
    }
  }

  sendDialogueEvent(event: DialogueEvent): void {
    if (!this.webContents.isDestroyed()) {
      this.webContents.send("dialogueEvent", event);
    }
  }
}
