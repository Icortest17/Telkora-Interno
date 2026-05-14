'use client'

import { useRouter } from 'next/navigation'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityScore } from '@/components/shared/PriorityScore'
import { getInitials, formatEUR, isFollowupUrgente } from '@/lib/utils'
import type { Lead } from '@/types'

interface LeadCardProps {
  lead: Lead
}

export function LeadCard({ lead }: LeadCardProps) {
  const router = useRouter()
  const urgente = isFollowupUrgente(lead.proximo_followup)

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => router.push(`/leads/${lead.id}`)}
      className="cursor-pointer rounded-lg border border-telkora-border bg-telkora-card p-3 transition-colors hover:border-telkora-accent/30 hover:bg-telkora-card2"
    >
      {/* Header: empresa + urgente */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight text-telkora-text line-clamp-2">
          {lead.empresa}
        </p>
        {urgente && (
          <span className="flex shrink-0 items-center gap-1 rounded bg-telkora-danger/20 px-1.5 py-0.5 text-[10px] font-bold text-telkora-danger">
            <AlertTriangle className="size-3" />
            URGENTE
          </span>
        )}
      </div>

      {/* Pack */}
      {lead.pack_interes && (
        <p className="mt-1.5 truncate text-[11px] text-telkora-muted">{lead.pack_interes}</p>
      )}

      {/* Footer: valor + prioridad + avatar */}
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-xs font-medium text-telkora-accent">
          {formatEUR(lead.valor_estimado)}
        </span>
        <div className="flex items-center gap-1.5">
          <PriorityScore score={lead.prioridad_score} />
          {lead.responsable_id && (
            <div className="flex size-5 items-center justify-center rounded-full bg-telkora-card2 text-[9px] text-telkora-muted ring-1 ring-telkora-border">
              {getInitials(lead.responsable_id.slice(0, 6))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
