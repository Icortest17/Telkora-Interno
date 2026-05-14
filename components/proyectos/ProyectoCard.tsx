'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, CircleDollarSign } from 'lucide-react'
import { formatEUR, formatDate } from '@/lib/utils'
import { ESTADOS_PROYECTO } from '@/lib/constants'
import type { Proyecto } from '@/types'

interface ProyectoCardProps {
  proyecto: Proyecto
  clienteNombre?: string
  onClick?: () => void
}

const PRIORIDAD_COLOR = { alta: '#FF4444', media: '#FFD700', baja: '#888888' }

export function ProyectoCard({ proyecto, clienteNombre, onClick }: ProyectoCardProps) {
  const config = ESTADOS_PROYECTO[proyecto.estado]
  const vencido =
    proyecto.fecha_entrega_estimada &&
    !['entregado', 'cancelado'].includes(proyecto.estado) &&
    new Date(proyecto.fecha_entrega_estimada) < new Date()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: proyecto.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-telkora-border bg-telkora-card p-3 transition-colors hover:border-telkora-accent/30 hover:bg-telkora-card2"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight text-telkora-text line-clamp-2">{proyecto.nombre}</p>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
          style={{ backgroundColor: PRIORIDAD_COLOR[proyecto.prioridad] + '25', color: PRIORIDAD_COLOR[proyecto.prioridad] }}
        >
          {proyecto.prioridad.toUpperCase()}
        </span>
      </div>

      {clienteNombre && (
        <p className="mt-1 truncate text-[11px] text-telkora-muted">{clienteNombre}</p>
      )}

      {/* Progress bar */}
      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] text-telkora-muted">Avance</span>
          <span className="text-[10px] font-medium" style={{ color: config.color }}>
            {proyecto.porcentaje_completado}%
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-telkora-card2">
          <div
            className="h-1 rounded-full transition-all"
            style={{ width: `${proyecto.porcentaje_completado}%`, backgroundColor: config.color }}
          />
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-xs font-medium text-telkora-accent">
          {formatEUR(proyecto.presupuesto ?? 0)}
        </span>
        <div className="flex items-center gap-1 text-[10px]" style={{ color: vencido ? '#FF4444' : '#666666' }}>
          <Calendar className="size-3" />
          {proyecto.fecha_entrega_estimada ? formatDate(proyecto.fecha_entrega_estimada) : '—'}
        </div>
      </div>
    </div>
  )
}
