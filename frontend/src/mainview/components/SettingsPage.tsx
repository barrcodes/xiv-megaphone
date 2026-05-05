import { setPort, setStartOnStartup, reconnect, disconnect } from '@/lib/ipc'
import { ArrowLeftIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'

export function SettingsPage() {
  const { connectionStatus, port, setPort: storeSetPort, startOnStartup, setStartOnStartup: storeSetStartOnStartup } = useStore()
  const navigate = useNavigate()

  async function handlePortChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newPort = Number(e.target.value)
    if (!Number.isInteger(newPort) || newPort < 1 || newPort > 65535) return
    storeSetPort(newPort)
    await setPort(newPort)
  }

  async function handleStartOnStartupChange(enabled: boolean) {
    storeSetStartOnStartup(enabled)
    await setStartOnStartup(enabled)
  }

  async function handleReconnect() {
    await reconnect()
  }

  async function handleDisconnect() {
    await disconnect()
  }

  const statusBadge = {
    connected: <Badge className="bg-green-600 text-white">Connected</Badge>,
    connecting: <Badge className="bg-yellow-500 text-white">Connecting...</Badge>,
    disconnected: <Badge variant="secondary">Disconnected</Badge>,
  }[connectionStatus]

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ArrowLeftIcon className="cursor-pointer" onClick={() => navigate('/')} />
        <h2 className="text-lg font-semibold mb-0 align-middle">Settings</h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="port-input" className="text-sm whitespace-nowrap">
              Port
            </Label>
            <Input
              id="port-input"
              type="number"
              value={port}
              onChange={handlePortChange}
              className="w-24 h-8"
              min={1}
              max={65535}
            />
          </div>
          {statusBadge}
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="startup-toggle"
            checked={startOnStartup}
            onCheckedChange={handleStartOnStartupChange}
          />
          <Label htmlFor="startup-toggle" className="text-sm cursor-pointer whitespace-nowrap">
            Launch on startup
          </Label>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={connectionStatus !== 'disconnected'}
            onClick={handleReconnect}
          >
            Reconnect
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={connectionStatus !== 'connected'}
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  )
}
