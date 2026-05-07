export type IpcMessageType = "Say" | "Cancel";
export type TextSource = "Chat" | "AddonTalk" | "AddonBattleTalk" | "None";

export interface VoicePreset {
  Name: string;
}

export interface IpcMessage {
  Type: IpcMessageType;
  Speaker: string | null;
  NpcId: number | null;
  Race: string | null;
  BodyType: string | null;
  Payload: string;
  PayloadTemplate: string;
  Voice: VoicePreset | null;
  StuttersRemoved: boolean;
  Source: TextSource;
  ChatType: number | null;
  Language: string | null;
}