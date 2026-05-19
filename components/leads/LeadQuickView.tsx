'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, ExternalLink, Phone, Mail, MessageCircle, Calendar } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatEUR, formatDate } from '@/lib/utils'
import { ESTADOS_LEAD, ESTADOS_LEAD_ORDER } from '@/lib/constants'
import type { Lead, EstadoLead } from '@/types'
import type { Usuario } from '@/lib/profile'

interface Props {
  lead: Lead | null
  usuarios: Usuario[]
  onClose: () => void
  onUpdateEstado: (leadId: string, estado: EstadoLead) => void
  onUpdateFollowup: (leadId: string, fecha: string | null) => void
}

export function LeadQuickView({ lead, usuarios, onClose, onUpdateEstado, onUpdateFollowup }: Props) {
  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const router = useRouter()
  const ownerNombre = lead ? (usuarios.find(u => u.userId === lead.owner_id)?.nombre ?? '—') : '—'

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${lead ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-telkora-border bg-telkora-card shadow-2xl transition-transform duration-200 ${lead ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {lead && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-telkora-border p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-telkora-text">{lead.empresa}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <StatusBadge estado={lead.estado} />
                  <span className="text-xs font-medium text-telkora-accent">{formatEUR(lead.valor_estimado)}</span>
                </div>
              </div>
              <div className="ml-2 flex items-center gap-1">
                <button
                  onClick={() => { router.push(`/leads/${lead.id}`); onClose() }}
                  className="flex size-7 items-center justify-center rounded border border-telkora-border text-telkora-muted hover:text-telkora-text"
                  title="Ver ficha completa"
                >
                  <ExternalLink className="size-3.5" />
                </button>
                <button
                  onClick={onClose}
                  className="flex size-7 items-center justify-center rounded border border-telkora-border text-telkora-muted hover:text-telkora-text"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {/* Contact */}
              <section>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-telkora-muted">Contacto</p>
                <div className="space-y-1.5">
                  {lead.contacto && <p className="text-xs text-telkora-text">{lead.contacto}</p>}
                  {lead.telefono && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-telkora-muted">{lead.telefono}</span>
                      <a href={`tel:${lead.telefono}`} className="text-telkora-muted hover:text-telkora-accent"><Phone className="size-3.5" /></a>
                      <a href={`https://wa.me/${lead.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-telkora-muted hover:text-green-500"><MessageCircle className="size-3.5" /></a>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs text-telkora-muted">{lead.email}</span>
                      <a href={`mailto:${lead.email}`} className="text-telkora-muted hover:text-telkora-accent"><Mail className="size-3.5" /></a>
                    </div>
                  )}
                </div>
              </section>

              {/* Details */}
              <section className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Sector', value: lead.sector },
                  { label: 'Fuente', value: lead.fuente },
                  { label: 'Responsable', value: ownerNombre },
                  { label: 'Follow-up', value: lead.proximo_followup ? formatDate(lead.proximo_followup) : null },
                  { label: 'Valor estimado', value: formatEUR(lead.valor_estimado) },
                  { label: 'Valor ponderado', value: formatEUR(lead.valor_ponderado) },
                ].map(({ label, value }) => value ? (
                  <div key={label} className="rounded-lg bg-telkora-card2 p-2">
                    <p className="text-[10px] text-telkora-muted">{label}</p>
                    <p className="mt-0.5 text-xs text-telkora-text">{value}</p>
                  </div>
                ) : null)}
              </section>

              {/* Cambiar estado */}
              <section>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-telkora-muted">Cambiar estado</p>
                <div className="flex flex-wrap gap-1">
                  {ESTADOS_LEAD_ORDER.map((estado) => {
                    const cfg = ESTADOS_LEAD[estado]
                    const isActive = lead.estado === estado
                    return (
                      <button
                        key={estado}
                        onClick={() => onUpdateEstado(lead.id, estado)}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-opacity ${isActive ? 'opacity-100 ring-1' : 'opacity-60 hover:opacity-100'}`}
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Follow-up */}
              <section>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-telkora-muted">Proximo follow-up</p>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    defaultValue={lead.proximo_followup?.slice(0, 10) ?? ''}
                    onChange={(e) => onUpdateFollowup(lead.id, e.target.value || null)}
                    className="h-8 flex-1 rounded border border-telkora-border bg-telkora-card2 px-2 text-xs text-telkora-text focus:outline-none focus:ring-1 focus:ring-telkora-accent"
                  />
                  <Calendar className="size-4 text-telkora-muted" />
                </div>
              </section>

              {/* Notas */}
              {lead.notas && (
                <section>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-telkora-muted">Notas</p>
                  <p className="line-clamp-4 text-xs text-telkora-muted">{lead.notas}</p>
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
