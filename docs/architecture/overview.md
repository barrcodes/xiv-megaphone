# Architecture Overview

xiv-megaphone is an Electron desktop application with three layers:

## Layers

| Layer | Path | Runtime | Role |
|-------|------|---------|------|
| **Main process** | `src/main/` | Node.js | Window management, WebSocket TTS client, file I/O, IPC handlers |
| **Preload** | `src/preload/` | Browser | Bridges main and renderer via `contextBridge` |
| **Renderer** | `src/mainview/` | Browser | React 19 SPA with hash-based routing |

## Tech Stack

| Concern | Technology |
|---------|-----------|
| Desktop shell | Electron 41 |
| Bundler | electron-vite + Vite 6 |
| UI framework | React 19 + React Router 7 |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix primitives) |
| State (client) | Zustand 5 |
| State (server) | TanStack React Query 5 |
| Forms | React Hook Form 7 + Zod 4 |
| Icons | lucide-react |
| Linter | Biome 2 |

## Communication Channels

1. **IPC** — Main process ↔ Renderer via preload bridge (presets, connection, logs, streams)
2. **WebSocket** — Main process ↔ FFXIV TextToTalk plugin (dialogue events)
3. **HTTP** — Renderer ↔ Backend API (TTS streams, credits, shop, policies)