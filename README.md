<div align="center">
  <h1>xiv-megaphone</h1>

  ![Icon](frontend/art-assets/icon-wake-256.png)

  A desktop application for Windows and Linux that simplifies AI TTS for FFXIV, built with Electron + React + Vite.

  [![Join our Discord](https://img.shields.io/badge/JOIN%20DISCORD-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/GSEuGqAGAf) [![Latest Release](https://img.shields.io/github/v/release/barrcodes/xiv-megaphone?style=for-the-badge&logo=github&label=Latest%20Release)](https://github.com/barrcodes/xiv-megaphone/releases/latest)
</div>

## Trial Credits

This app is brand new, built solely by me, and completely bootstrapped with very minimal budget - hence there is no easy free trial sign-up. But if you want to help me beta test the app, I can spare a couple bucks in credit in return for feedback and testing!

[![trial](screenshots/trial.png)](https://discord.com/invite/GSEuGqAGAf)

### Watch the teaser

[<img src="./screenshots/megaphone-teaser.png" width="360" />](https://www.youtube.com/watch?v=SIuOKiCDvGE)

## Prerequisites

- **Final Fantasy XIV**
- **[XIVLauncher](https://goatcorp.github.io/)** — custom launcher that enables Dalamud plugins ([GitHub](https://github.com/goatcorp/FFXIVQuickLauncher))
- **[TextToTalk](https://github.com/karashiiro/TextToTalk)** — Dalamud plugin (install via the Dalamud plugin manager)

## Installation

### Windows

1. Go to the [Releases](../../releases) page.
2. Download the latest `xiv-megaphone-<version> Setup.exe` installer.
3. Run the installer and launch the application.

### Linux (x86_64)

The installer downloads the latest published AppImage, checks its SHA-512 digest against the release update metadata, and installs it under `~/Applications`:

```sh
curl --fail --location --show-error https://raw.githubusercontent.com/barrcodes/xiv-megaphone/main/scripts/install-linux.sh --output /tmp/install-xiv-megaphone.sh
bash /tmp/install-xiv-megaphone.sh
rm /tmp/install-xiv-megaphone.sh
```

On Ubuntu, install FUSE 2 support if needed (`sudo apt install libfuse2` on 22.04 or `sudo apt install libfuse2t64` on 24.04). Fedora: `sudo dnf install fuse fuse-libs`. Arch Linux: `sudo pacman -S fuse2`. The AppImage runs with Electron's normal sandbox; do not disable it to work around a missing system dependency.

Linux automatic updates are supported for installed AppImages. When an update is found, choose **Download Update** or **Later**. After download, choose **Restart to Update** from the prompt, application menu, or tray menu. Extracted AppImages are not automatically updated. Launch-on-startup uses the installed AppImage path.

Create an account after launching the application.

## Setup

### Dalamud Setup

Install **TextToTalk** via the Dalamud plugin manager in-game. Starting with TextToTalk 1.39.2, Megaphone support is built in.

In the plugin settings, select **"megaphone"** from the provider dropdown in the Voices section — no other settings need to change out of the box.

![text-to-talk](screenshots/ttt-megaphone.png)

### Presets

A default preset ships with the app and is selected automatically. It provides custom voices for all race/gender combinations as well as beast tribes and a few notable named NPCs out of the box. More voices and features to come!

### Volume Control

When connected, a volume slider appears in the sidebar. Volume is saved between sessions.

The final output volume combines three factors:
- **TextToTalk** sends the FFXIV master × voice volume from in-game
- **Gain** multiplier adjusts per-voice levels server-side (some voices are louder than others)
- **Volume slider** multiplier lets you tune down the volume of tts voices relative to in-game voices as desired

### Custom Voice Assignments & Lexicon

![preset-list](screenshots/megaphone-preset-list.png)

You can create a preset to add your own custom voices overrides! Make one character sound like another. Here I've set Alphinaud to sound like a Lalafell.

![voice-override](screenshots/megaphone-voice-override.png)

You can also add your own lexicon to make things sound the way you want them to! Get opinionated! My personal favorite is to change my character's name to something fun.

![lexicon](screenshots/megaphone-lexicon.png)

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
cd frontend
bun run build
```

Compiles all three processes (main, preload, renderer) to `frontend/build/`.

## Package (Windows Squirrel installer)

```sh
cd frontend
bun run build:make
```

Produces Squirrel.Windows Setup, RELEASES, and NuGet package artifacts in `out/make/squirrel.windows/x64/`.

## Package (Linux AppImage)

On Linux x86_64, run `bun run package:linux` from `frontend/`. It builds an AppImage in `frontend/dist/linux/` without publishing. `bun run publish:linux` explicitly enables electron-builder's GitHub publishing behavior and should only be used for a release workflow.

Electron Forge commands use the npm executable shipped with Node.js for Forge's package-manager compatibility check; dependency installation and the authoritative lockfile remain Bun-based.

## Lint

```sh
cd frontend
bun run lint       # check
bun run lint:fix   # auto-fix
```

---

<sub>The xiv-megaphone voice API follows the same protocol as [TextToTalk](https://github.com/karashiiro/TextToTalk), so TextToTalk can also be configured to use xiv-megaphone as its TTS provider. However, we recommend using the xiv-megaphone plugin for the best experience.</sub>
