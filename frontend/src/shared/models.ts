export interface CreateStreamRequest {
  text: string;
  speaker?: string;
  source?: "Chat" | "AddonTalk" | "AddonBattleTalk" | "None";
  language?: string;
  chatType?: number;
  speakerWorld?: string;
  gender?: string;
  race?: string;
  voiceOverrides?: Record<string, string>;
  volume?: number;
}
