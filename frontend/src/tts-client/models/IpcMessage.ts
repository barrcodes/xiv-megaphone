import type { DialogueEventReason, IpcEventType, XivChatType } from "../../shared/playback";

export type IpcMessageType = "Say" | "Cancel" | "Event";
export type TextSource = "Chat" | "AddonTalk" | "AddonBattleTalk" | "None";

export interface VoicePreset {
  Name: string; // confusing, this is the gender
}

export interface IpcMessage {
  Type: IpcMessageType;
  Speaker: string | null;
  SpeakerWorld?: string | null;
  NpcId: number | null;
  Race: string | null;
  Gender?: string | null;
  BodyType: string | null;
  Payload: string;
  /** Original SeString before TextToTalk normalization. */
  RawPayload?: string;
  PayloadTemplate: string;
  Voice: VoicePreset | null;
  StuttersRemoved: boolean;
  Source: TextSource;
  ChatType: XivChatType | null;
  Language: string | null;
  Volume?: number;
  EventType?: IpcEventType;
  EventSessionId?: string;
  EventReason?: DialogueEventReason;
}

export interface DialogueEventMessage {
  Type: "Event";
  EventType: IpcEventType;
  SessionId: string;
  Source: TextSource;
  Reason: DialogueEventReason;
}
