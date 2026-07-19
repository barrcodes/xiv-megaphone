export interface CreateStreamRequest {
  text: string;
  speaker?: string;
  gender?: string;
  race?: string;
  voiceOverrides?: Record<string, string>;
  speakingRate?: number;
}