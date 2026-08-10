import type { WebContents } from "electron";
import type WebSocket from "ws";
import type { AudioClass, PlaybackRequest } from "../../shared/playback";
import type { Preset } from "../../shared/types";
import type { IpcMessage } from "../models/IpcMessage";
import { PlaybackIpc } from "./playback-ipc";
import { SocketManager } from "./socket";

export interface TtsSocketOptions {
  port: number;
  preset: Preset;
  webContents: WebContents;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

let requestIdCounter = 0;

function nextRequestId(): string {
  return `req_${Date.now()}_${++requestIdCounter}`;
}

function classifyAudioClass(message: IpcMessage): AudioClass | null {
  if (message.Type !== "Say") return null;
  switch (message.Source) {
    case "AddonTalk":
      return "npc";
    case "Chat":
      return "chat";
    case "AddonBattleTalk":
      return "flavor";
    default:
      return null;
  }
}

function normalizeCharacterMetadata(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();
  return normalized === "none" || normalized === "unknown" ? undefined : normalized;
}

export class TtsSocket extends SocketManager {
  private preset: Preset;
  private player: PlaybackIpc;

  constructor(options: TtsSocketOptions) {
    super(`ws://localhost:${options.port}/Messages`);
    this.preset = options.preset;
    this.player = new PlaybackIpc(options.webContents);

    this.onOpen = options.onConnected ?? null;
    this.onClose = options.onDisconnected ?? null;
  }

  updatePreset(preset: Preset): void {
    this.preset = preset;
  }

  protected _onOpen(): void {
    console.log("TTS WebSocket connected");
  }

  protected _onMessage(data: WebSocket.Data): void {
    try {
      const message: IpcMessage = JSON.parse(data.toString());
      this.handleMessage(message);
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  private handleMessage(message: IpcMessage): void {
    switch (message.Type) {
      case "Cancel":
        console.log("cancel message received, stopping NPC playback");
        this.player.cancel({ scope: "npc" });
        return;

      case "Event":
        if (!message.EventType || !message.EventSessionId || !message.EventReason) {
          console.warn("Invalid dialogue event received");
          return;
        }
        console.log(`Dialogue event received: ${JSON.stringify(message, null, 2)}`);
        this.player.sendDialogueEvent({
          eventType: message.EventType,
          sessionId: message.EventSessionId,
          source: message.Source,
          reason: message.EventReason,
        });
        return;

      case "Say":
        break;

      default:
        console.warn(`Unsupported message type: ${(message as { Type: string }).Type}`);
        return;
    }

    console.log(`Say message received: ${JSON.stringify(message, null, 2)}`);

    const audioClass = classifyAudioClass(message);
    if (!audioClass) {
      console.warn(`Unclassified text source: ${message.Source}, discarding`);
      return;
    }

    let text = message.Payload;
    if (this.preset.lexicon) {
      for (const [word, replacement] of Object.entries(this.preset.lexicon)) {
        text = text.replaceAll(word, replacement);
      }
    }

    const request: PlaybackRequest = {
      id: nextRequestId(),
      receivedAt: Date.now(),
      audioClass,
      source: message.Source,
      chatType: message.ChatType,
      tts: {
        text,
        speaker: message.Speaker?.toLowerCase(),
        source: message.Source,
        language: message.Language ?? undefined,
        chatType: message.ChatType ?? undefined,
        speakerWorld: message.SpeakerWorld ?? undefined,
        gender: normalizeCharacterMetadata(message.Gender ?? message.Voice?.Name),
        race: normalizeCharacterMetadata(message.Race),
        voiceOverrides: this.preset.voiceOverrides,
        volume: message.Volume ?? 1,
      },
    };

    this.player.createStream(request);
  }

  protected _onClose(): void {}
}
