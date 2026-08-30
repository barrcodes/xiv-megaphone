# IPC Channels

The preload script (`src/preload/index.ts`) exposes typed methods via `contextBridge.exposeInMainWorld` under `window.electronAPI`. All renderer-side listeners return a cleanup function that removes the listener.

## Renderer → Main (invoke/handle)

| Method | Args | Returns | Description |
|--------|------|---------|-------------|
| `getPresets` | — | `Preset[]` | List all saved presets |
| `getPreset` | `id: string` | `Preset \| null` | Get a single preset |
| `savePreset` | `preset: Preset` | `void` | Create or update a preset |
| `deletePreset` | `id: string` | `void` | Delete a preset |
| `getActivePreset` | — | `string` | Get active preset ID |
| `setActivePreset` | `id: string` | `void` | Set active preset |
| `getPort` | — | `number` | Get WebSocket port |
| `setPort` | `port: number` | `void` | Set WebSocket port |
| `getStartOnStartup` | — | `boolean` | Get auto-start setting |
| `setStartOnStartup` | `enabled: boolean` | `void` | Set auto-start |
| `getI18nState` | — | `I18nState` | Get system, selected, and effective UI languages |
| `setLanguage` | `language: SupportedLanguage \| null` | `I18nState` | Persist or clear the UI language override and update native UI |
| `connect` | — | `void` | Connect to FFXIV plugin |
| `disconnect` | — | `void` | Disconnect from FFXIV plugin |
| `getAuthState` | — | `AuthState` | Get current auth state |
| `openExternal` | `url: string` | `void` | Open URL in system browser |
| `onCheckoutComplete` | — | `void` | Notify main of checkout completion |

## Main → Renderer (push events)

| Event | Payload | Description |
|-------|---------|-------------|
| `onPresetsChanged` | — | Presets were modified on disk |
| `onConnectionChanged` | `ConnectionStatus` | Connection state changed |
| `onLogLine` | `LogLine` | New log entry |
| `createStream` | `PlaybackRequest` | TTS stream request with audio class and metadata |
| `cancelStream` | `CancelScopePayload` | Cancel playback with scope (`"npc"`, `"chat"`, `"flavor"`, `"all"`) |
| `dialogueEvent` | `DialogueEvent` | Dialogue session lifecycle event |
| `authCallback` | `AuthCallbackData` | OAuth callback received |
| `checkoutComplete` | — | Payment provider checkout finished |

Localization uses the channels `app:get-i18n-state` and `app:set-language`. The renderer receives the effective UI locale before initialization; TTS/game language is metadata in `PlaybackRequest.tts.language`, not an IPC UI-locale setting. See [frontend i18n](../frontend/i18n.md).

## Types

### PlaybackRequest

```typescript
interface PlaybackRequest {
  id: string
  receivedAt: number
  audioClass: "npc" | "chat" | "flavor"
  source: "Chat" | "AddonTalk" | "AddonBattleTalk" | "None"
  chatType: XivChatType | null
  tts: CreateStreamRequest
}
```

`CreateStreamRequest.rawPayload` contains the original SeString payload before
TextToTalk normalization. It is preserved for dialogue cache identity, while
`text` contains the normalized payload used to create the TTS request.

### CancelScopePayload

```typescript
interface CancelScopePayload {
  scope: "npc" | "chat" | "flavor" | "all"
}
```

### DialogueEvent

```typescript
interface DialogueEvent {
  eventType: string
  sessionId: string
  source: "Chat" | "AddonTalk" | "AddonBattleTalk" | "None"
  reason: DialogueEventReason
}
```
