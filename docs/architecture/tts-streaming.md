# TTS Streaming

## End-to-End Flow

```
FFXIV Plugin (TextToTalk)
    │
    │ WebSocket
    ▼
Main Process (tts-client/)
    │
    │ IPC (createStream)
    ▼
Renderer (AudioPlayer component)
    │
    │ HTTP POST stream request, GET stream by id
    ▼
Backend API
    │
    │ TTS SDK / API
    ▼
TTS Provider
```

## Step-by-Step

1. **FFXIV plugin** sends `IpcMessage` with type `"Say"` (dialogue line) or `"Cancel"` (stop current speech) over WebSocket
2. **Main process** `TtsSocket` receives the message, applies lexicon replacements from the active preset, and forwards via IPC to the renderer
3. **Renderer** `AudioPlayer` component receives the `createStream` event, calls `POST /tts/stream` with the dialogue text, voice, and rate
4. **Backend** validates the prompt (security checks), resolves the voice, spends credits, and streams MP3 audio from the TTS provider
5. **Renderer** reads the audio stream via `ReadableStreamDefaultReader`, feeds it into a `MediaSource` with `audio/mpeg` source buffer, and plays through `AudioContext` with a `GainNode` for volume control
6. The audio is played through the default output device

## Stream Lifecycle

- **Start**: `POST /tts/stream` returns `{ streamId, gain }` — gain is the speaking rate from the preset
- **Stream**: `GET /tts/stream/:streamId` returns the MP3 audio as a byte stream
- **Cancel**: A `"Cancel"` IPC message stops the current stream and clears the buffer
- **Error**: On failure, the backend returns a fallback audio clip (see TTS Coordination docs)

## Custom DOM Events

The renderer fires custom `xiv:stream-event` events on the window for completion/cancellation tracking.