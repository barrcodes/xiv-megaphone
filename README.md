<div align="center">
  <h1>xiv-megaphone</h1>

  ![Icon](frontend/art-assets/icon-cait-sith-wake-256.png)

  A Windows desktop application to simplify AI TTS for FFXIV, built with Electron + React + Vite.
</div>

## Prerequisites

- **Final Fantasy XIV**
- **[XIVLauncher](https://goatcorp.github.io/)** — custom launcher that enables Dalamud plugins ([GitHub](https://github.com/goatcorp/FFXIVQuickLauncher))
- **[xiv-megaphone-plugin](https://github.com/barrcodes/xiv-megaphone-plugin)** — Dalamud plugin (install via the Dalamud plugin manager)

## Installation

1. Go to the [Releases](../../releases) page.
2. Download the latest `.exe` installer.
3. Run the installer and launch the application.

## Setup

### Dalamud Setup

Install the **xiv-megaphone-plugin** via the Dalamud plugin manager in-game. The app will connect automatically once the plugin is enabled and you are in-game.

### Presets

A default preset ships with the app and is selected automatically. It provides voices for all race/gender combinations as well as beast tribes out of the box. More voices and presets to come.

## Voice selection

Voices are selected per-NPC using a priority chain:

1. Named speaker match (by speaker name, lowercased)
2. Beast tribe NPC lookup (matches speaker to tribe, then resolves tribe voice)
3. Race + gender match (e.g. `"au ra female"`)
4. Gender-only fallback (`male` / `female`)
5. Default voice

## Notes

- After any FFXIV patch, Dalamud becomes temporarily incompatible and plugins stop working for a few days — longer after an expansion launch. This is normal; wait for Dalamud and plugin updates to catch up before using this.
- The app must be running before you enter a dialogue that triggers speech. It does not replay missed lines.
- Only one instance should be running at a time.

# Development and Contributing

## Development Prerequisites

- [Node.js](https://nodejs.org/) 20.19+ required by electron-vite
- [Bun](https://bun.sh/) recommended package manager and script runner

## Install

```sh
./instal.sh
```

or

```powershell
./install.ps1
```

## Dev (with HMR)

```sh
cd frontend
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
bun run build:make
```

Produces an NSIS installer in `out/make/[platform]`.

## Lint

```sh
bun run lint       # check
bun run lint:fix   # auto-fix
```

---

<sub>The xiv-megaphone voice API follows the same protocol as [TextToTalk](https://github.com/karashiiro/TextToTalk), so TextToTalk can also be configured to use xiv-megaphone as its TTS provider. However, we recommend using the xiv-megaphone plugin for the best experience.</sub>
