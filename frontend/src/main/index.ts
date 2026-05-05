import { join } from 'node:path'
import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron'
import type { ConnectionStatus } from '../../../frontend-shared/types'
import { getStartOnStartup, setStartOnStartup } from './config'
import { ConnectionManager } from './connection'
import { bootstrap } from './presets'
import { registerIpcHandlers, pushConnectionChanged } from './ipc'
import connectedIcon from '../../resources/connected.ico?asset'
import disconnectedIcon from '../../resources/disconnected.ico?asset'
import appIcon from '../../art-assets/icon-cait-sith-wake-256.png?asset'

let presetWindow: BrowserWindow | null = null
let tray: Tray | null = null

function getWindow() {
  return presetWindow
}

function createPresetWindow() {
  presetWindow = new BrowserWindow({
    title: 'Preset Editor',
    width: 800,
    height: 600,
    x: 150,
    y: 150,
    icon: nativeImage.createFromPath(appIcon),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    presetWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    presetWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  presetWindow.on('closed', () => {
    presetWindow = null
  })
}

function openPresetEditor() {
  if (presetWindow) {
    presetWindow.show()
  } else {
    createPresetWindow()
  }
}

function buildTrayMenu(status: ConnectionStatus) {
  return Menu.buildFromTemplate([
    { label: 'Change Preset', click: () => openPresetEditor() },
    { type: 'separator' },
    {
      label: 'Disconnect',
      enabled: status === 'connected',
      click: () => connection.disconnect(),
    },
    {
      label: 'Reconnect',
      enabled: status === 'disconnected',
      click: () => connection.connect(),
    },
    { type: 'separator' },
    { label: 'Exit', click: () => app.quit() },
  ])
}

const connection = new ConnectionManager((status) => {
  if (tray) {
    tray.setImage(nativeImage.createFromPath(status === 'connected' ? connectedIcon : disconnectedIcon))
    tray.setContextMenu(buildTrayMenu(status))
  }
  pushConnectionChanged(presetWindow, status)
})

app.whenReady().then(async () => {
  bootstrap()

  const startOnStartup = await getStartOnStartup()
  await setStartOnStartup(startOnStartup)

  registerIpcHandlers(getWindow, connection)

  tray = new Tray(nativeImage.createFromPath(disconnectedIcon))
  tray.setToolTip('xiv-tts-app')
  tray.setContextMenu(buildTrayMenu(connection.getStatus()))

  tray.on('click', () => openPresetEditor())

  console.log('xiv-tts-app started')
}).catch((err) => {
  console.error('Failed to start:', err)
  app.quit()
})

app.on('window-all-closed', (e: Event) => {
  e.preventDefault()
})
