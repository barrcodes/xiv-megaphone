# xiv-megaphone

AI-powered Text-to-Speech for Final Fantasy XIV. Electron + React desktop app with a Bun/Elysia backend.

## Topics

### Architecture

- [overview](architecture/overview.md) — Electron 3-layer architecture, tech stack
- [ipc](architecture/ipc.md) — IPC channels: main ↔ preload ↔ renderer
- [tts-streaming](architecture/tts-streaming.md) — End-to-end TTS flow
- [tts-client](architecture/tts-client.md) — WebSocket client library

### Frontend

- [component-tree](frontend/component-tree.md) — React component hierarchy, routing, pages
- [state-management](frontend/state-management.md) — Zustand, React Query, React Hook Form
- [auth](frontend/auth.md) — Supabase authentication, deep links, policy acceptance

### Development

- [setup](development/setup.md) — Prerequisites, env vars, running locally
- [building](development/building.md) — Packaging and CI/CD

---

## Backend Documentation

The backend service lives in `svc/backend/` (git submodule). Its docs are at [svc/backend/docs/index.md](../svc/backend/docs/index.md) — that file may not exist if the submodule is not initialized or you don't have access to the backend repository.