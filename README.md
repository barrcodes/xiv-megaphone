# xiv-tts-app

A Windows desktop application for managing TTS presets for FFXIV, built with Electron + React + Vite.

## Prerequisites

- [Node.js](https://nodejs.org/) 20.19+ (required by electron-vite)
- [Bun](https://bun.sh/) (package manager and script runner)

## Install

```sh
cd frontend
bun install
```

## Dev (with HMR)

```sh
bun run dev
```

Opens an Electron window. The renderer hot-reloads on file changes; the main process restarts on main/preload changes.

## Build

```sh
bun run build
```

Compiles all three processes to `out/`.

## Package (Windows installer)

```sh
bun run package:win
```

Produces an NSIS installer in `dist/`.

## Lint

```sh
bun run lint       # check
bun run lint:fix   # auto-fix
```

## Project structure

```
frontend/
  src/
    main/         # Electron main process (Node.js)
    preload/      # Preload script + window.electronAPI types
    mainview/     # React renderer (Vite + Tailwind + shadcn)
frontend-shared/  # Shared TypeScript types
```
