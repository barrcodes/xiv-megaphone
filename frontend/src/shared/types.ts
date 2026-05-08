export interface LogLine {
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export interface NamedVoice {
	name: string;
	voice: string;
}

export interface Preset {
	id: string;
	name: string;
	male: string;
	female: string;
	default: string;
	namedVoices: Record<string, string>;
	speakingRate: number;
	isDefault?: boolean;
}
