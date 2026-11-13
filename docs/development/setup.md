# Development Setup

## Prerequisites

- [Bun](https://bun.sh) (latest)
- [mprocs](https://github.com/pvolok/mprocs) (for running local app processes concurrently)

## Environment

The frontend configuration is in the tracked `frontend/.env` file. Keep only
non-secret values that are intended to ship with the distributed app there;
keep credentials and environment-specific secrets out of the repository.
`VITE_DEBUG` is optional and defaults to `false`.

Use `frontend/.env.development.local` for local-only overrides when needed.

### Main Process (`src/main/`)

Uses `src/shared/env.ts` which reads from `import.meta.env` (Vite) or `process.env` (Node) depending on the runtime.

## Running

```bash
# From project root
bun run dev
```

This runs the local app processes concurrently via `mprocs.yaml`.

Install backend dependencies separately before starting the complete local app:

```bash
cd svc/backend
bun install
```

See the [backend development setup](../../svc/backend/docs/development/setup.md)
for backend environment and local database requirements.

## Git Hooks

Install the root dependencies with `bun install` to configure the root repository's hooks.
The hooks are stored in `.githooks/` and configure themselves through Git's `core.hooksPath`.

- **Pre-commit**: Runs `bun run lint:fix` and fails on Biome errors or warnings.
  Root Biome checks exclude the backend submodule, which has its own lint hook.
- **Pre-push**: Runs the frontend test suite only when the pushed ref updates
  change `frontend/`. Backend submodule pointer updates and tooling-only changes
  skip frontend tests. Backend tests belong to the backend submodule's own hook.

Push hooks compare each outgoing ref against its remote tip, including deletions
and renames of files, and run each applicable suite once. Deleted refs are skipped.
New refs or unavailable remote tips are compared against an empty tree, so all
applicable suites present in the pushed tree run. Tests execute in the current
checkout; commit the changes you intend to validate before pushing.

To configure the root hooks manually:

```bash
git config core.hooksPath .githooks
```

Use `--no-verify` only when intentionally bypassing a hook.

## Smoke Test

Start the smoke environment from the project root:

```bash
bun run smoke
```

The smoke environment is configured separately from the frontend development
environment. Use the project-specific smoke command when validating the complete
application locally.
