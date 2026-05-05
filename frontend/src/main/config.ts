import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { app } from 'electron'
import { DEFAULT_PORT } from '../../../frontend-shared/defaults'

const configFile = join(app.getPath('userData'), 'config.json')

function spawnAsync(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args)
    proc.on('close', code => code === 0 ? resolve() : reject(code))
  })
}

export async function getPort(): Promise<number> {
  if (!existsSync(configFile)) return DEFAULT_PORT
  const data = JSON.parse(await fs.readFile(configFile, 'utf-8')) as { port?: number }
  return data.port ?? DEFAULT_PORT
}

export async function setPort(port: number): Promise<void> {
  const current = existsSync(configFile)
    ? (JSON.parse(await fs.readFile(configFile, 'utf-8')) as Record<string, unknown>)
    : {}
  await fs.writeFile(configFile, JSON.stringify({ ...current, port }, null, 2))
}

const STARTUP_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
const STARTUP_VALUE = 'xiv-tts-app'

export async function getStartOnStartup(): Promise<boolean> {
  if (!existsSync(configFile)) return false
  const data = JSON.parse(await fs.readFile(configFile, 'utf-8')) as { startOnStartup?: boolean }
  return data.startOnStartup ?? false
}

export async function setStartOnStartup(enabled: boolean): Promise<void> {
  const current = existsSync(configFile)
    ? (JSON.parse(await fs.readFile(configFile, 'utf-8')) as Record<string, unknown>)
    : {}
  await fs.writeFile(configFile, JSON.stringify({ ...current, startOnStartup: enabled }, null, 2))

  if (process.platform === 'win32') {
    try {
      if (enabled) {
        await spawnAsync('reg', [
          'add', STARTUP_KEY,
          '/v', STARTUP_VALUE,
          '/t', 'REG_SZ',
          '/d', process.execPath,
          '/f',
        ])
      } else {
        await spawnAsync('reg', ['delete', STARTUP_KEY, '/v', STARTUP_VALUE, '/f'])
      }
    } catch {
      // reg delete exits 1 when key doesn't exist; reg add may fail without admin — non-fatal
    }
  }
}
