export interface CreateStreamRequest {
  text: string;
  /** Original SeString used to identify pre-generated dialogue audio. */
  rawPayload?: string;
  speaker?: string;
  source?: "Chat" | "AddonTalk" | "AddonBattleTalk" | "None";
  audioClass?: "npc" | "chat" | "flavor";
  language?: string;
  chatType?: number;
  speakerWorld?: string;
  modelCharaId?: number;
  gender?: string;
  race?: string;
  voiceOverrides?: Record<string, string>;
  volume?: number;
}
