import { deletePreset, setActivePreset } from '@/lib/ipc'
import { useNavigate } from 'react-router-dom'
import type { Preset } from 'shared/types'
import { useStore } from '../store'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Separator } from './ui/separator'

export function PresetList() {
  const { presets, activePresetId, setActivePresetId } = useStore()
  const navigate = useNavigate()

  async function handleDelete(id: string) {
    await deletePreset(id)
  }

  async function handleActiveChange(id: string) {
    await setActivePreset(id)
    setActivePresetId(id)
  }

  function handleNewPreset() {
    const base = presets.find((p) => p.id === 'default') ?? presets[0]
    const newPreset: Preset = {
      ...base,
      id: globalThis.crypto.randomUUID(),
      name: '',
      isDefault: false,
    }
    navigate('/preset/new', { state: { preset: newPreset } })
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Presets</h1>

      <div className="space-y-1">
        <label className="text-sm font-medium">Active Preset</label>
        <Select value={activePresetId} onValueChange={handleActiveChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a preset" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="flex items-center justify-between rounded-md border px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{preset.name}</span>
              {preset.isDefault && <Badge variant="secondary">Default</Badge>}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/preset/${preset.id}`)}>
                Edit
              </Button>
              {!preset.isDefault && (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(preset.id)}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
        <Button onClick={handleNewPreset} size="sm">
          New Preset
        </Button>
      </div>
    </div>
  )
}
