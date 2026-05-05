import { ipcMain, BrowserWindow } from 'electron'
import type { ConnectionManager } from './connection'
import type { ConnectionStatus } from '../../../frontend-shared/types'
import { loadPresets, savePreset, deletePreset, getActivePresetId, setActivePresetId } from './presets'
import { getPort, setPort, getStartOnStartup, setStartOnStartup } from './config'

export function registerIpcHandlers(
  getWindow: () => BrowserWindow | null,
  connection: ConnectionManager
) {
  ipcMain.handle('getPresets',         ()           => loadPresets())
  ipcMain.handle('savePreset',         (_, preset)  => { savePreset(preset); pushPresetsChanged(getWindow()) })
  ipcMain.handle('deletePreset',       (_, id)      => { deletePreset(id);   pushPresetsChanged(getWindow()) })
  ipcMain.handle('setActivePreset',    (_, id)      => { setActivePresetId(id); connection.setPreset(id) })
  ipcMain.handle('getActivePreset',    ()           => getActivePresetId())
  ipcMain.handle('getConnectionState', ()           => ({ status: connection.getStatus() }))
  ipcMain.handle('reconnect',          ()           => connection.connect())
  ipcMain.handle('disconnect',         ()           => connection.disconnect())
  ipcMain.handle('getPort',            async ()     => ({ port: await getPort() }))
  ipcMain.handle('setPort',            async (_, p) => { await setPort(p); connection.setPort(p) })
  ipcMain.handle('getStartOnStartup',  async ()     => ({ enabled: await getStartOnStartup() }))
  ipcMain.handle('setStartOnStartup',  async (_, en) => setStartOnStartup(en))
}

function pushPresetsChanged(win: BrowserWindow | null) {
  win?.webContents.send('onPresetsChanged', loadPresets())
}

export function pushConnectionChanged(win: BrowserWindow | null, status: ConnectionStatus) {
  win?.webContents.send('onConnectionChanged', status)
}
