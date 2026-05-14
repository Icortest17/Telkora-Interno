import type { PrioridadScore } from '@/types'

interface PriorityScoreProps {
  score: PrioridadScore
}

const CONFIG: Record<PrioridadScore, { label: string; color: string; bg: string }> = {
  3: { label: 'Alta',  color: '#FF4444', bg: '#3A0D0D' },
  2: { label: 'Media', color: '#FF8C00', bg: '#3D2200' },
  1: { label: 'Baja',  color: '#888888', bg: '#1A1A1A' },
}

export function PriorityScore({ score }: PriorityScoreProps) {
  const cfg = CONFIG[score]
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}
