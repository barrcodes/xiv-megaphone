import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getPresets:         ()        => ipcRenderer.invoke('getPresets'),
  savePreset:         (preset)  => ipcRenderer.invoke('savePreset', preset),
  deletePreset:       (id)      => ipcRenderer.invoke('deletePreset', id),
  setActivePreset:    (id)      => ipcRenderer.invoke('setActivePreset', id),
  getActivePreset:    ()        => ipcRenderer.invoke('getActivePreset'),
  getConnectionState: ()        => ipcRenderer.invoke('getConnectionState'),
  reconnect:          ()        => ipcRenderer.invoke('reconnect'),
  disconnect:         ()        => ipcRenderer.invoke('disconnect'),
  getPort:            ()        => ipcRenderer.invoke('getPort'),
  setPort:            (port)    => ipcRenderer.invoke('setPort', port),
  getStartOnStartup:  ()        => ipcRenderer.invoke('getStartOnStartup'),
  setStartOnStartup:  (enabled) => ipcRenderer.invoke('setStartOnStartup', enabled),
  onPresetsChanged:    (cb) => ipcRenderer.on('onPresetsChanged',    (_, d) => cb(d)),
  onConnectionChanged: (cb) => ipcRenderer.on('onConnectionChanged', (_, d) => cb(d)),
})
