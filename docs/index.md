# xiv-megaphone

AI-powered Text-to-Speech for Final Fantasy XIV. Electron + React desktop app.

## Topics

### Architecture

- [overview](architecture/overview.md) — Electron 3-layer architecture, tech stack
- [ipc](architecture/ipc.md) — IPC channels: main ↔ preload ↔ renderer
- [tts-streaming](architecture/tts-streaming.md) — Client-side TTS flow
- [tts-client](architecture/tts-client.md) — WebSocket client library

### Frontend

- [component-tree](frontend/component-tree.md) — React component hierarchy, routing, pages
- [state-management](frontend/state-management.md) — Zustand, React Query, React Hook Form
- [i18n](frontend/i18n.md) — UI locale resolution, persistence, IPC, and supported languages
- [auth](frontend/auth.md) — Authentication flow, deep links, and policy gating

### Development

- [setup](development/setup.md) — Prerequisites, env vars, running locally
- [building](development/building.md) — Packaging and CI/CD
