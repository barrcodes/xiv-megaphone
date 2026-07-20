# State Management

Three tools manage different kinds of state:

## Zustand (Client State)

`src/mainview/store.ts` — global app state:

```typescript
interface AppStore {
  presets: Preset[]
  activePresetId: string
  connectionStatus: ConnectionStatus  // "disconnected" | "connecting" | "connected"
  port: number
  startOnStartup: boolean
  logs: LogLine[]
}
```

Setters are available for each field. The store is initialized in `App.tsx` via `useEffect` calling IPC methods (`getPresets`, `getActivePreset`, etc.). IPC listeners in `src/lib/ipc.ts` update the store reactively when the main process pushes changes.

## TanStack React Query (Server State)

Queries for backend API data:

| Query | Hook  | Refresh |
|-------|------|---------|
| Balance | `useBalance` | On mount, after checkout |
| Account status | `useAccountStatus` | On mount, after checkout |
| Auto-refresh | `useRefreshBalanceOnStream`| After each TTS stream |

## React Hook Form (Form State)

Used in `PresetForm` for preset editing:
- **GeneralTab**: Name, speaking rate (0.5x – 1.5x)
- **VoiceOverridesTab**: Dynamic list via `useFieldArray`
- **LexiconTab**: Dynamic list via `useFieldArray`

Zod schemas validate form data before submission.