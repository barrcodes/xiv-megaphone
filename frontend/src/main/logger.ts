import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { app, type BrowserWindow } from "electron";
import type { LogLine } from "../shared/types";

let getWindow: () => BrowserWindow | null = () => null;
let logFilePath: string | null = null;

function getLogsDir() {
  const logsDir = join(app.getPath("userData"), "logs");
  mkdirSync(logsDir, { recursive: true });
  return logsDir;
}

function getCurrentLogFile() {
  const logsDir = getLogsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return join(logsDir, `xiv-megaphone-${timestamp}.log`);
}

function getOrCreateLogFile(): string {
  if (!logFilePath) {
    logFilePath = getCurrentLogFile();
  }
  return logFilePath;
}

function pruneOldLogs() {
  const logsDir = getLogsDir();
  const files = readdirSync(logsDir)
    .filter((f) => f.startsWith("xiv-megaphone-") && f.endsWith(".log"))
    .map((f) => ({ name: f, path: join(logsDir, f) }))
    .sort((a, b) => b.name.localeCompare(a.name));

  for (const file of files.slice(5)) {
    unlinkSync(file.path);
  }
}

function formatLine(level: LogLine["level"], message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
}

function writeToFile(message: string) {
  const file = getOrCreateLogFile();
  appendFileSync(file, message);
}

function pushToRenderer(line: LogLine) {
  const win = getWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send("onLogLine", line);
  }
}

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

function patchedConsole(level: LogLine["level"], args: unknown[]) {
  const message = args
    .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
    .join(" ");
  const line: LogLine = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };
  const formatted = formatLine(level, message);
  writeToFile(formatted);
  pushToRenderer(line);
  const original =
    level === "error"
      ? originalConsole.error
      : level === "warn"
        ? originalConsole.warn
        : originalConsole.log;
  original.call(console, ...args);
}

export function initLogger(getWindowFn: () => BrowserWindow | null) {
  getWindow = getWindowFn;
  pruneOldLogs();

  console.log = (...args: unknown[]) => patchedConsole("log", args);
  console.warn = (...args: unknown[]) => patchedConsole("warn", args);
  console.error = (...args: unknown[]) => patchedConsole("error", args);
}
