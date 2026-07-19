export interface LogLine {
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export interface Preset {
  id: string;
  name: string;
  speakingRate: number;
  lexicon?: Record<string, string>;
  voiceOverrides: Record<string, string>;
}