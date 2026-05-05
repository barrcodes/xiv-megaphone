import type { Preset, ConnectionStatus } from 'shared/types'
import { useStore } from '../store'

const api = window.electronAPI

export const getPresets         = (): Promise<Preset[]>                     => api.getPresets()
export const savePreset         = (p: Preset): Promise<void>                => api.savePreset(p)
export const deletePreset       = (id: string): Promise<void>               => api.deletePreset(id)
export const setActivePreset    = (id: string): Promise<void>               => api.setActivePreset(id)
export const getActivePreset    = (): Promise<string>                       => api.getActivePreset()
export const getConnectionState = (): Promise<{ status: ConnectionStatus }> => api.getConnectionState()
export const reconnect          = (): Promise<void>                         => api.reconnect()
export const disconnect         = (): Promise<void>                         => api.disconnect()
export const getPort            = (): Promise<{ port: number }>             => api.getPort()
export const setPort            = (port: number): Promise<void>             => api.setPort(port)
export const getStartOnStartup  = (): Promise<{ enabled: boolean }>         => api.getStartOnStartup()
export const setStartOnStartup  = (en: boolean): Promise<void>              => api.setStartOnStartup(en)

api.onPresetsChanged(    presets => useStore.getState().setPresets(presets))
api.onConnectionChanged( status  => useStore.getState().setConnectionStatus(status))
