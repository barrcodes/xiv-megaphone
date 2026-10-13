# Building and Packaging

## Build

```bash
cd frontend
bun run build
```

Uses electron-vite to build three targets: `main`, `preload`, and `renderer`, under `frontend/build/`. The packaged main entry is `./build/main/index.js`.

## Packaging

Windows and Linux use separate packaging pipelines so their updater formats and release assets stay independent.

### Windows: Electron Forge / Squirrel.Windows

```bash
bun run build:make
```

Produces a Squirrel Setup executable, `RELEASES`, and `.nupkg` in `out/make/squirrel.windows/x64/`. This is the Windows update format used with `update-electron-app`; the application identity, package name, and GitHub repository remain `xiv-megaphone` / `barrcodes/xiv-megaphone`.

### Linux: electron-builder AppImage

Requires Linux x86_64 and AppImage/FUSE build tooling. `electron-builder.linux.yml` is an independent electron-builder v26 config; no Forge prepackaged app or shared builder config is used.

```sh
cd frontend
bun run package:linux
```

The local command writes `dist/linux/xiv-megaphone-linux-x64.AppImage` and `latest-linux.yml`, and explicitly does not publish. `bun run publish:linux` is a separate publishing command. The release workflow instead creates a single draft release, runs Windows Forge and Linux AppImage jobs in parallel, verifies both packages, and uploads artifacts to that draft. Publish the release manually in GitHub after review.

### Dependencies and package verification

Install frontend dependencies reproducibly with `bun install --frozen-lockfile` (Bun 1.3.14 in CI). The Bun lockfile is authoritative. `package-lock.json` is a stale npm lockfile from version 0.2.3 and is not used by CI; refresh it with npm only if npm becomes a supported installation path.

`bun run verify:win` checks the assembled app archive, entry points, runtime dependencies, resources, Electron fuses, x64 executable, Setup artifact, and every Squirrel `RELEASES` reference's SHA-1 and size. `bun run verify:linux` checks the unpacked app and extracts the actual AppImage with `--appimage-extract` into a temporary directory, then checks its archive, resources, updater config, fuses, x64 ELF, version, and update metadata digest/size. No FUSE mount or application launch is needed for these checks. `scripts/verify-release-assets.cjs` applies the same Squirrel and Linux metadata checks to assets downloaded from a draft release.

## CI/CD

GitHub Actions (`.github/workflows/release.yml`) runs on `v*` tags. The tag must match the frontend version. Preparation uses `gh release view` to create or reuse only a draft release, verifies the tag on creation, and fails for a published release or any API error other than an explicit missing release. Windows and Linux packaging run in parallel; verified Forge Squirrel and electron-builder assets are uploaded with `gh release upload --clobber` to avoid rebuilding during publish. A final job downloads the draft assets and runs `scripts/verify-release-assets.cjs`. Release publication is a manual GitHub UI action; there is no required-approval deployment environment.

## Auto-Update

Windows uses `update-electron-app` and Squirrel.Windows, initialized after the logger is ready. Packaged Linux AppImages use `electron-updater` v6 with GitHub release metadata. When an update is available, the app asks before downloading; **Later** defers it. Once downloaded, the user can restart from the prompt, the Linux application menu, or the tray menu. The updater is only loaded for the primary packaged Linux AppImage process when `APPIMAGE` is set. Its restart releases the single-instance lock before the v6 AppImage updater starts the replacement, and restores the lock if installation reports an error.

Shared desktop behavior preserves Windows close-to-tray operation, but shows the window if tray initialization fails. Authentication deep links wait for the login listener and initial session state; callbacks received during an authenticated session are discarded, and pending authentication payloads are cleared at session boundaries so they cannot be replayed after logout.

## Linux installer and manual validation

`scripts/install-linux.sh` downloads the stable x86_64 AppImage to a temporary file, validates its SHA-512 against `latest-linux.yml`, and atomically installs it as `~/Applications/xiv-megaphone.AppImage`. It registers a desktop launcher and `xiv-megaphone://` handler. The desktop entry and XDG autostart both reference this stable path rather than the transient AppImage mount path.

Before publishing a release, manually validate:

1. Install and launch on Fedora, Ubuntu, and Arch Linux; confirm the window and application menu are usable on GNOME even when no tray extension is present.
2. Test tray creation, restore, Linux close-to-quit behavior, reconnect, and tray icon changes while connected/disconnected.
3. Test social-auth and checkout deep links on first launch and while a second instance is already running; confirm auth codes work and tokens are never logged.
4. Enable/disable launch-on-startup and inspect `~/.config/autostart/xiv-megaphone.desktop`; confirm its executable is the stable installed AppImage.
5. Publish a test draft/release, install version N, publish N+1, confirm the explicit Download/Later prompt, defer it, then use **Restart to Update** from the app menu without a tray and verify N+1 starts.
6. On Windows, upgrade an existing Squirrel installation to the new Setup release and confirm the existing `update-electron-app` path still updates it.

These OS/runtime upgrade scenarios need actual Linux/Windows machines and a published test release; package inspection and CI do not substitute for them.
