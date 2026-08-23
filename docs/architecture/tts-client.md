# TTS Client Library

Located at `src/tts-client/`, this is a self-contained WebSocket client library that runs in the Electron main process.

## Architecture

```
SocketManager (abstract)
    └─ TtsSocket
        └─ uses PlaybackIpc
```

## Classes

### SocketManager

Abstract class managing WebSocket lifecycle:
- Connects to `ws://localhost:{port}/Messages`
- Auto-reconnect on disconnect (5-second interval)
- Handles open/close/error events

### TtsSocket

Extends `SocketManager`. Parses incoming JSON messages as `IpcMessage` objects:

- `"Say"` — dialogue line with speaker name, text, and metadata. Classified by `Source`:
  - `AddonTalk` and `AddonBattleTalk` → `npc`
  - `Chat` → `chat`, except `ChatType.NPCDialogue` and `ChatType.NPCDialogueAnnouncements`, which → `npc`
  - unsupported sources → discarded
  - Unknown sources are discarded
- `"Cancel"` — stop NPC playback only (`{ scope: "npc" }`); chat and flavor are unaffected
- `"Event"` — session lifecycle event (validated before forwarding)

Applies lexicon replacements from the active preset before forwarding `"Say"` messages. Generates unique request IDs and `receivedAt` timestamps for each request.

### PlaybackIpc

Sends stream requests, cancellation scopes, and dialogue events to the renderer via IPC:

- `createStream(request: PlaybackRequest)` → sends `"createStream"` IPC event
- `cancel(payload: CancelScopePayload)` → sends `"cancelStream"` IPC event
- `sendDialogueEvent(event: DialogueEvent)` → sends `"dialogueEvent"` IPC event

All methods guard against destroyed WebContents to prevent errors during shutdown.

## Models

### IpcMessage

```typescript
interface IpcMessage {
   type: "Say" | "Cancel" | "Event"
  Source?: "AddonTalk" | "Chat" | "AddonBattleTalk" | string
  Speaker?: string
  Payload?: string
  Voice?: { Name: string }
  Race?: string
  ChatType?: XivChatType
  Volume?: number
  EventType?: string
  SessionId?: string
  Reason?: DialogueEventReason
}
```

### PlaybackRequest

```typescript
interface PlaybackRequest {
  id: string
  receivedAt: number
  audioClass: "npc" | "chat" | "flavor"
  source: TextSource
  chatType: XivChatType | null
  tts: CreateStreamRequest
}
```

`CreateStreamRequest` preserves both the raw addon `source` (`Chat`, `AddonTalk`, or
`AddonBattleTalk`) and its normalized `audioClass` (`chat`, `npc`, or `flavor`) for
backend tracing. Its optional `rawPayload` contains the original SeString before
TextToTalk normalization and is used as the dialogue cache identity; `text` is the
normalized payload sent to the backend.

### DialogueEvent

```typescript
interface DialogueEvent {
   eventType: `NpcDialogueSessionStarted` | `NpcDialogueSessionEnded`
  sessionId: string
  source: TextSource
  reason: DialogueEventReason
}
```

`EventType` is the authoritative dialogue-session lifecycle discriminator. `EventReason` is preserved from the plugin message but is not used to determine whether the session is active.

DialogueEventReason: `TextReceived` | `AddonShown` | `DialogueContextStarted` | `DialogueContextEnded` | `TerritoryChanged` | `LoggedOut` | `PluginStopped`

### CancelScopePayload

```typescript
interface CancelScopePayload {
  scope: "npc" | "chat" | "flavor" | "all"
}
```
