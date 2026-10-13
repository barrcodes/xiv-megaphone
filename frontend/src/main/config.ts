import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { app } from "electron";
import { DEFAULT_PORT, DEFAULT_VOLUME } from "../shared/defaults";
import { escapeDesktopExecArg } from "./desktop-entry";

const configFile = join(app.getPath("userData"), "config.json");

function spawnAsync(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(code)));
  });
}

export async function getPort(): Promise<number> {
  if (!existsSync(configFile)) return DEFAULT_PORT;
  const data = JSON.parse(await fs.readFile(configFile, "utf-8")) as {
    port?: number;
  };
  return data.port ?? DEFAULT_PORT;
}

export async function setPort(port: number): Promise<void> {
  const current = existsSync(configFile)
    ? (JSON.parse(await fs.readFile(configFile, "utf-8")) as Record<string, unknown>)
    : {};
  await fs.writeFile(configFile, JSON.stringify({ ...current, port }, null, 2));
}

export async function getVolume(): Promise<number> {
  if (!existsSync(configFile)) return DEFAULT_VOLUME;
  const data = JSON.parse(await fs.readFile(configFile, "utf-8")) as {
    volume?: number;
  };
  return data.volume ?? DEFAULT_VOLUME;
}

export async function setVolume(volume: number): Promise<void> {
  const current = existsSync(configFile)
    ? (JSON.parse(await fs.readFile(configFile, "utf-8")) as Record<string, unknown>)
    : {};
  await fs.writeFile(configFile, JSON.stringify({ ...current, volume }, null, 2));
}

const STARTUP_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const STARTUP_VALUE = "xiv-megaphone";

export async function getStartOnStartup(): Promise<boolean> {
  if (!existsSync(configFile)) return false;
  const data = JSON.parse(await fs.readFile(configFile, "utf-8")) as {
    startOnStartup?: boolean;
  };
  return data.startOnStartup ?? false;
}

export async function setStartOnStartup(enabled: boolean): Promise<void> {
  const effectiveEnabled =
    enabled &&
    (process.platform === "win32" ||
      (process.platform === "linux" && Boolean(process.env.APPIMAGE) && app.isPackaged));
  const current = existsSync(configFile)
    ? (JSON.parse(await fs.readFile(configFile, "utf-8")) as Record<string, unknown>)
    : {};
  await fs.writeFile(
    configFile,
    JSON.stringify({ ...current, startOnStartup: effectiveEnabled }, null, 2),
  );

  if (process.platform === "win32") {
    try {
      if (effectiveEnabled) {
        await spawnAsync("reg", [
          "add",
          STARTUP_KEY,
          "/v",
          STARTUP_VALUE,
          "/t",
          "REG_SZ",
          "/d",
          `"${process.execPath}"`,
          "/f",
        ]);
      } else {
        await spawnAsync("reg", ["delete", STARTUP_KEY, "/v", STARTUP_VALUE, "/f"]);
      }
    } catch {
      // reg delete exits 1 when key doesn't exist; reg add may fail without admin — non-fatal
    }
  } else if (process.platform === "linux") {
    const xdgConfigHome = process.env.XDG_CONFIG_HOME;
    const autostartDir = join(
      xdgConfigHome && isAbsolute(xdgConfigHome) ? xdgConfigHome : join(homedir(), ".config"),
      "autostart",
    );
    const desktopFile = join(autostartDir, "xiv-megaphone.desktop");
    if (effectiveEnabled && process.env.APPIMAGE) {
      await fs.mkdir(autostartDir, { recursive: true });
      await fs.writeFile(
        desktopFile,
        `[Desktop Entry]\nType=Application\nName=xiv-megaphone\nExec="${escapeDesktopExecArg(resolve(process.env.APPIMAGE))}" %U\nTerminal=false\nX-GNOME-Autostart-enabled=true\n`,
      );
    } else {
      await fs.rm(desktopFile, { force: true });
    }
  }
}

export async function getLanguage(): Promise<string | null> {
  if (!existsSync(configFile)) return null;
  const data = JSON.parse(await fs.readFile(configFile, "utf-8")) as {
    language?: string;
  };
  return data.language ?? null;
}

export async function setLanguage(language: string | null): Promise<void> {
  const current = existsSync(configFile)
    ? (JSON.parse(await fs.readFile(configFile, "utf-8")) as Record<string, unknown>)
    : {};

  if (language === null) {
    delete current.language;
  } else {
    current.language = language;
  }

  await fs.writeFile(configFile, JSON.stringify(current, null, 2));
}
