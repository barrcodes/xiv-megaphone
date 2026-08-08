# TTS Streaming

## End-to-End Flow

```
FFXIV Plugin (TextToTalk)
    │
    │ WebSocket
    ▼
Main Process (TtsSocket → PlaybackIpc)
    │
    │ IPC (createStream / dialogueEvent / cancelStream)
    ▼
Renderer (AudioPlayer)
    │
    └─ AudioScheduler (classification, queuing, interruption)
         │
         ├─ npc → StreamPlayer (replacement)
         ├─ chat → StreamPlayer (FIFO + interruption + resume)
         └─ flavor → StreamPlayer[n] (concurrent pool + eviction)
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

1. **FFXIV plugin** sends `IpcMessage` with type `"Say"` (dialogue line), `"Cancel"` (stop NPC playback), or `"Event"` (session lifecycle) over WebSocket
2. **Main process** `TtsSocket` receives the message:
   - `"Say"` → classifies by source (`AddonTalk` → `npc`, `Chat` → `chat`, `AddonBattleTalk` → `flavor`), applies lexicon replacements, and forwards a `PlaybackRequest` via `PlaybackIpc.createStream()`
   - `"Cancel"` → sends `CancelScopePayload` with `{ scope: "npc" }` via `PlaybackIpc.cancel()`; plugin cancellation never stops chat or flavor
   - `"Event"` → validates and forwards via `PlaybackIpc.sendDialogueEvent()`
3. **Renderer** `AudioPlayer` component receives the IPC events and forwards them to `AudioScheduler`
4. **AudioScheduler** applies class-specific policies:
    - **npc**: replaces any active NPC playback immediately, cancels active flavor, suppresses incoming flavor while active, and interrupts chat if active
   - **chat**: maintains a FIFO queue; active chat is interrupted during NPC dialogue sessions and resumed when the session ends; respects queue size (10) and age (30s) limits with up to 3 resume attempts
    - **flavor**: maintains a concurrent pool (default 3) using the oldest-first eviction strategy when at capacity; flavor is discarded during NPC playback or dialogue sessions
   - Dialogue session events (`AddonShown`, `TextReceived`, `DialogueContextEnded`, `TerritoryChanged`, `LoggedOut`, `PluginStopped`) control chat suppression during NPC interactions
5. **StreamPlayer** handles the actual audio lifecycle:
   - Calls `POST /tts/stream` to create a stream, then reads MP3 data via `ReadableStreamDefaultReader`
   - Feeds chunks into a `MediaSource` with `audio/mpeg` source buffer
   - Plays through `AudioContext` with a `GainNode` for volume and mute control
   - Includes stale-generation protection: old `play()` calls are ignored after a replacement
   - Tracks cleanup via a swappable cleanup function (upgraded when `AudioContext` and object URL are created)

## Audio Classes

| Class | Policy | Concurrency | Interruption |
|-------|--------|-------------|-------------|
| `npc` | Replacement | 1 | Replaces old NPC; interrupts chat |
| `chat` | FIFO queue | 1 | Interrupted during dialogue; auto-resumed |
| `flavor` | Pool + eviction | Pool size (3) | Oldest evicted when pool full |

## Dialogue Session Events

| Reason | Action |
|--------|--------|
| `AddonShown` | Start dialogue session, interrupt active chat |
| `TextReceived` | Refresh session activity timer |
| `DialogueContextEnded` | End session, resume interrupted chat |
| `TerritoryChanged` | End session, resume interrupted chat |
| `LoggedOut` | End session, resume interrupted chat |
| `PluginStopped` | End session, resume interrupted chat |

## Scoped Cancellation

The `cancel()` API supports scope filtering: `"npc"`, `"chat"`, `"flavor"`, or `"all"`. WebSocket plugin `Cancel` messages use only the `"npc"` scope. Chat and flavor scopes remain available to internal callers, while renderer teardown may use `"all"`. Cancelling chat also clears the queue and interrupted job. Cancelling flavor evicts all active slots. NPC startup independently cancels active flavor as part of its priority policy.

## Stale Playback Protection

Each `StreamPlayer.play()` call increments a generation counter (`gen`). Async callbacks check `gen !== this.gen` before acting, preventing stale completions from cleaning up a replaced playback. The scheduler additionally checks `playback.jobId` and playback object identity in completion watchers.

## Stream Lifecycle

- **Start**: `POST /tts/stream` returns `{ streamId, gain }`
- **Stream**: `GET /tts/stream/:streamId` returns MP3 audio as a byte stream
- **Completion**: Reader EOF calls `MediaSource.endOfStream()`, but playback completes only after the audio element emits `ended`; buffered audio is not discarded at network EOF
- **Cancel**: AbortController aborts the HTTP fetch; cleanup removes the audio element, revokes the object URL, and closes the AudioContext
- **Error**: On failure, resolves as `{ kind: "errored", error }` or `{ kind: "cancelled" }` for AbortError
- **Cleanup**: Audio element is paused, detached from the DOM, and its source is cleared; AudioContext is closed; Blob URL is revoked; OpenTelemetry trace is finalized
