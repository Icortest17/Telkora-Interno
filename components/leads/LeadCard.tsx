'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreHorizontal } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityScore } from '@/components/shared/PriorityScore'
import { getInitials, formatEUR, isFollowupUrgente, isFollowupProximo } from '@/lib/utils'
import { ESTADOS_LEAD, ESTADOS_LEAD_ORDER } from '@/lib/constants'
import type { Lead, EstadoLead } from '@/types'
import type { Usuario } from '@/lib/profile'
import { differenceInDays } from 'date-fns'

interface LeadCardProps {
  lead: Lead
  usuarios?: Usuario[]
  onUpdateEstado?: (leadId: string, estado: EstadoLead) => void
  onUpdateFollowup?: (leadId: string, fecha: string | null) => void
}

function getDiasEnEtapa(lead: Lead): number {
  const ref = lead.updated_at ?? lead.created_at
  if (!ref) return 0
  return Math.max(0, differenceInDays(new Date(), new Date(ref)))
}

export function LeadCard({ lead, usuarios = [], onUpdateEstado, onUpdateFollowup }: LeadCardProps) {
  const router = useRouter()
  const urgente = isFollowupUrgente(lead.proximo_followup)
  const proximo = !urgente && isFollowupProximo(lead.proximo_followup)
  const diasEnEtapa = getDiasEnEtapa(lead)

  const [showActions, setShowActions] = useState(false)
  const [showEstadoMenu, setShowEstadoMenu] = useState(false)
  const [showFollowupPicker, setShowFollowupPicker] = useState(false)
  const [followupValue, setFollowupValue] = useState(lead.proximo_followup?.slice(0, 10) ?? '')
  const actionsRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Resolve owner name
  const ownerNombre = usuarios.find(
    (u) => u.userId === lead.owner_id || u.userId === lead.responsable_id
  )?.nombre ?? (lead.owner_id ? lead.owner_id.slice(0, 6) : null)

  // Close actions on outside click
  useEffect(() => {
    if (!showActions) return
    function handleClickOutside(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setShowActions(false)
        setShowEstadoMenu(false)
        setShowFollowupPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showActions])

  function handleMoreClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    setShowActions((v) => !v)
    setShowEstadoMenu(false)
    setShowFollowupPicker(false)
  }

  function handleEstadoChange(e: React.MouseEvent, estado: EstadoLead) {
    e.stopPropagation()
    e.preventDefault()
    onUpdateEstado?.(lead.id, estado)
    setShowActions(false)
    setShowEstadoMenu(false)
  }

  function handleFollowupSave(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation()
    onUpdateFollowup?.(lead.id, followupValue || null)
    setShowFollowupPicker(false)
    setShowActions(false)
  }

  // Border indicator class
  const borderClass = urgente
    ? 'border-l-2 border-l-telkora-danger'
    : proximo
    ? 'border-l-2 border-l-yellow-500'
    : ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => router.push(`/leads/${lead.id}`)}
      className={`group relative cursor-pointer rounded-lg border border-telkora-border bg-telkora-card p-3 transition-colors hover:border-telkora-accent/30 hover:bg-telkora-card2 ${borderClass}`}
    >
      {/* Actions button — visible on hover */}
      <div
        ref={actionsRef}
        className="absolute right-2 top-2"
        style={{ zIndex: 50 }}
      >
        <button
          onClick={handleMoreClick}
          className="flex size-5 items-center justify-center rounded opacity-0 transition-opacity hover:bg-telkora-card2 group-hover:opacity-100"
          aria-label="Acciones del lead"
        >
          <MoreHorizontal className="size-3.5 text-telkora-muted" />
        </button>

        {showActions && (
          <div
            className="absolute right-0 top-6 min-w-[180px] rounded-lg border border-telkora-border bg-telkora-card shadow-xl"
            style={{ zIndex: 50 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cambiar estado */}
            <button
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-telkora-text hover:bg-telkora-card2"
              onClick={(e) => {
                e.stopPropagation()
                setShowEstadoMenu((v) => !v)
                setShowFollowupPicker(false)
              }}
            >
              <span>Cambiar estado</span>
              <span className="text-telkora-muted">›</span>
            </button>

            {showEstadoMenu && (
              <div className="border-t border-telkora-border">
                {ESTADOS_LEAD_ORDER.filter((e) => e !== lead.estado).map((estado) => {
                  const cfg = ESTADOS_LEAD[estado]
                  return (
                    <button
                      key={estado}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-telkora-card2"
                      onClick={(e) => handleEstadoChange(e, estado)}
                    >
                      <span
                        className="size-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: cfg.color }}
                      />
                      <span style={{ color: cfg.color }}>{cfg.label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Editar follow-up */}
            <button
              className="flex w-full items-center px-3 py-2 text-left text-xs text-telkora-text hover:bg-telkora-card2 border-t border-telkora-border"
              onClick={(e) => {
                e.stopPropagation()
                setShowFollowupPicker((v) => !v)
                setShowEstadoMenu(false)
              }}
            >
              Editar follow-up
            </button>

            {showFollowupPicker && (
              <div className="border-t border-telkora-border px-3 py-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="date"
                  value={followupValue}
                  onChange={(e) => setFollowupValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFollowupSave(e)
                    if (e.key === 'Escape') {
                      e.stopPropagation()
                      setShowFollowupPicker(false)
                    }
                  }}
                  className="mb-1 w-full rounded border border-telkora-border bg-telkora-card2 px-2 py-1 text-xs text-telkora-text focus:outline-none focus:ring-1 focus:ring-telkora-accent"
                />
                <button
                  className="w-full rounded bg-telkora-accent px-2 py-1 text-[10px] font-medium text-telkora-bg hover:opacity-90"
                  onClick={handleFollowupSave}
                >
                  Guardar
                </button>
              </div>
            )}

            {/* Ver detalle */}
            <button
              className="flex w-full items-center px-3 py-2 text-left text-xs text-telkora-text hover:bg-telkora-card2 border-t border-telkora-border"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/leads/${lead.id}`)
              }}
            >
              Ver detalle ↗
            </button>
          </div>
        )}
      </div>

      {/* Header: empresa */}
      <div className="pr-6">
        <p className="text-sm font-semibold leading-tight text-telkora-text line-clamp-2">
          {lead.empresa}
        </p>
      </div>

      {/* Estado badge */}
      {lead.estado && (
        <div className="mt-1.5">
          <StatusBadge estado={lead.estado} />
        </div>
      )}

      {/* Pack */}
      {lead.pack_interes && (
        <p className="mt-1 truncate text-[11px] text-telkora-muted">{lead.pack_interes}</p>
      )}

      {/* Footer: valor + prioridad + avatar + días */}
      <div className="mt-2.5 flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-telkora-accent">
          {formatEUR(lead.valor_estimado)}
        </span>
        <div className="flex items-center gap-1.5">
          <PriorityScore score={lead.prioridad_score} />
          {ownerNombre && (
            <div
              className="flex size-5 items-center justify-center rounded-full bg-telkora-card2 text-[9px] text-telkora-muted ring-1 ring-telkora-border"
              title={ownerNombre}
            >
              {getInitials(ownerNombre)}
            </div>
          )}
          <span className="rounded bg-telkora-card2 px-1.5 py-0.5 text-[9px] text-telkora-muted">
            {diasEnEtapa}d
          </span>
        </div>
      </div>
    </div>
  )
}
