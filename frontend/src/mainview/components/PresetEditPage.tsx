import { savePreset } from '@/lib/ipc'
import { ArrowLeftIcon } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Preset } from 'shared/types'
import { useStore } from '../store'
import { PresetForm } from './PresetForm'

export function PresetEditPage() {
  const { id } = useParams()
  const { state } = useLocation()
  const presets = useStore((s) => s.presets)
  const navigate = useNavigate()

  const preset: Preset | undefined =
    id === 'new' ? state?.preset : presets.find((p) => p.id === id)

  async function handleSave(saved: Preset) {
    await savePreset(saved)
    navigate('/')
  }

  if (!preset) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">Preset not found.</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <ArrowLeftIcon className="cursor-pointer" onClick={() => navigate('/')} />
        <h2 className="text-lg font-semibold mb-0 align-middle">
          {preset.name ? (preset.isDefault ? 'View Preset' : 'Edit Preset') : 'New Preset'}
        </h2>
      </div>
      <PresetForm preset={preset} onSave={handleSave} onCancel={() => navigate('/')} />
    </div>
  )
}
