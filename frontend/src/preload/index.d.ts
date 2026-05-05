import type { Preset, ConnectionStatus } from '../../frontend-shared/types'

declare global {
  interface Window {
    electronAPI: {
      getPresets(): Promise<Preset[]>
      savePreset(preset: Preset): Promise<void>
      deletePreset(id: string): Promise<void>
      setActivePreset(id: string): Promise<void>
      getActivePreset(): Promise<string>
      getConnectionState(): Promise<{ status: ConnectionStatus }>
      reconnect(): Promise<void>
      disconnect(): Promise<void>
      getPort(): Promise<{ port: number }>
      setPort(port: number): Promise<void>
      getStartOnStartup(): Promise<{ enabled: boolean }>
      setStartOnStartup(enabled: boolean): Promise<void>
      onPresetsChanged(cb: (presets: Preset[]) => void): void
      onConnectionChanged(cb: (status: ConnectionStatus) => void): void
    }
  }
}
