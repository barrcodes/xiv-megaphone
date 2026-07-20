# xiv-megaphone

Electron + React desktop app for AI-powered Text-to-Speech in Final Fantasy XIV.
## Commands

### Frontend (`frontend/`)

| Command | Description |
|---------|-------------|
| `cd frontend && bun run build` | Build for production |
| `cd frontend && bun run lint` | Lint with Biome |

### Backend (`svc/backend/backend/`)

| Command | Description |
|---------|-------------|
| `cd svc/backend/backend && bun run dev` | Start dev server (hot reload) |
| `cd svc/backend/backend && bun run start` | Start production server |
| `cd svc/backend/backend && bun run test` | Run unit tests |
| See `backend/docs/development/testing.md` for database tests |

## Documentation

Living docs at `docs/` (root) and `svc/backend/docs/`. These are the source of truth. Update them when the application changes.

- [Root docs index](docs/index.md)
- [Backend docs index](svc/backend/docs/index.md)
