export interface CreateStreamRequest {
  text: string;
  voice: string;
  model?: string;
  speakingRate?: number;
}
