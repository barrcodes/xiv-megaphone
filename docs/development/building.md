# Building and Packaging

## Build

```bash
cd frontend
bun run build
```

Uses electron-vite to build three targets: `main`, `preload`, `renderer`.

## Packaging

Two packaging pipelines are configured:

### electron-builder (NSIS for Windows)

```bash
bun run make
```

Produces an NSIS installer for Windows. Configuration in `electron-builder.yml`.

### electron-forge (Squirrel.Windows)

Alternative packaging pipeline configured in `forge.config.js`. Supports:
- Windows (Squirrel)
- macOS (ZIP)
- Linux (DEB, RPM)

## CI/CD

GitHub Actions (`.github/`) handles automated builds and releases on push/tag.

## Auto-Update

Uses `update-electron-app` for automatic updates on Windows (Squirrel).