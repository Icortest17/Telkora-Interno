import { ESTADOS_LEAD } from '@/lib/constants'
import type { EstadoLead } from '@/types'

interface StatusBadgeProps {
  estado: EstadoLead
  className?: string
}

export function StatusBadge({ estado, className = '' }: StatusBadgeProps) {
  const config = ESTADOS_LEAD[estado]
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  )
}
