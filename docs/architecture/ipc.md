# IPC Channels

The preload script (`src/preload/index.ts`) exposes typed methods via `contextBridge.exposeInMainWorld` under `window.electronAPI`.

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
| `createStream` | `CreateStreamRequest` | TTS stream request from game |
| `cancelStream` | — | Cancel current TTS stream |
| `authCallback` | `AuthCallbackData` | OAuth callback received |
| `checkoutComplete` | — | Payment provider checkout finished |