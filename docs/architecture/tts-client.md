# TTS Client Library

Located at `src/tts-client/`, this is a self-contained WebSocket client library that runs in the Electron main process.

## Architecture

```
SocketManager (abstract)
    └─ TtsSocket
        └─ uses WebAudioPlayer
```

## Classes

### SocketManager

Abstract class managing WebSocket lifecycle:
- Connects to `ws://localhost:{port}/Messages`
- Auto-reconnect on disconnect (5-second interval)
- Handles open/close/error events

### TtsSocket

Extends `SocketManager`. Parses incoming JSON messages as `IpcMessage` objects:
- `"Say"` — dialogue line with speaker name, text, and metadata
- `"Cancel"` — stop current speech

Applies lexicon replacements from the active preset before forwarding.

### WebAudioPlayer

Sends stream requests to the renderer via IPC. The `AudioPlayer` in the mainview handles it from here.

## Models

### IpcMessage

```typescript
interface IpcMessage {
  type: "Say" | "Cancel"
  speaker?: {
    name: string
    race: string
    gender: string
  }
  text?: {
    original: string
    processed: string
  }
}
```
