# Development Setup

## Prerequisites

- [Bun](https://bun.sh) (latest)
- [mprocs](https://github.com/pvolok/mprocs) (for running frontend + backend concurrently)

## Environment

Copy `.env` files from the project root and each subproject. Key variables:

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_BACKEND_URL` | Backend API URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key for user auth requests |
| `VITE_DEBUG` | Enable debug pages, as they are added |

### Main Process (`src/main/`)

Uses `src/shared/env.ts` which reads from `import.meta.env` (Vite) or `process.env` (Node) depending on the runtime.

## Running

```bash
# From project root
mprocs
```

This runs both the frontend and backend concurrently via `mprocs.yaml`:
- **Frontend**: `bun dev` in `frontend/`
- **Backend**: `bun dev` in `svc/backend/backend/`

## Backend

For backend-specific setup, see [svc/backend/docs/development/setup.md](../../svc/backend/docs/development/setup.md).