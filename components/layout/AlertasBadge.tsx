'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ExternalLink } from 'lucide-react'
import { useAlertas } from '@/hooks/useAlertas'
import { formatDate } from '@/lib/utils'
import type { Lead } from '@/types'

interface AlertasBadgeProps {
  leads: Lead[]
}

const STORAGE_KEY = 'telkora_notif_read_at'

function getTipoBadge(tipo: string) {
  const map: Record<string, string> = {
    urgente: 'bg-red-500/20 text-red-400',
    proximo: 'bg-yellow-500/20 text-yellow-400',
    sin_followup: 'bg-gray-500/20 text-gray-400',
  }
  return map[tipo] ?? 'bg-gray-500/20 text-gray-400'
}

function getTipoLabel(tipo: string) {
  const map: Record<string, string> = {
    urgente: 'Urgente',
    proximo: 'Próximo',
    sin_followup: 'Sin follow-up',
  }
  return map[tipo] ?? tipo
}

function getDaysInfo(lead: Lead, tipo: string) {
  if (tipo === 'sin_followup') {
    const days = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 86400000)
    return `Sin actividad hace ${days} días`
  }
  if (lead.proximo_followup) {
    const diff = Math.ceil(
      (new Date(lead.proximo_followup).getTime() - Date.now()) / 86400000
    )
    if (diff < 0) return `Vencido hace ${Math.abs(diff)} días`
    if (diff === 0) return 'Vence hoy'
    return `Vence en ${diff} días`
  }
  return ''
}

export function AlertasBadge({ leads }: AlertasBadgeProps) {
  const router = useRouter()
  const { alertas, urgentes, proximas, sinFollowup } = useAlertas(leads)
  const [open, setOpen] = useState(false)
  const [readAt, setReadAt] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load read timestamp from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setReadAt(Number(stored))
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleMarkAllRead() {
    const now = Date.now()
    localStorage.setItem(STORAGE_KEY, String(now))
    setReadAt(now)
  }

  // Count unread: alerts newer than readAt or any urgent
  const unreadCount = alertas.filter((a) => {
    if (a.tipo === 'urgente') return true
    return readAt === 0
  }).length

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center justify-center rounded-md p-2 text-telkora-muted transition-colors hover:bg-telkora-card2 hover:text-telkora-text"
        aria-label="Notificaciones"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-telkora-danger text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-telkora-border bg-telkora-card shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-telkora-border px-4 py-3">
            <span className="text-sm font-semibold text-telkora-text">Notificaciones</span>
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] text-telkora-muted hover:text-telkora-accent transition-colors"
            >
              Marcar todo como leído
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {alertas.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-green-400">Todo al día</p>
                <p className="mt-1 text-xs text-telkora-muted">No hay alertas pendientes</p>
              </div>
            ) : (
              <>
                {/* Urgentes */}
                {urgentes.length > 0 && (
                  <div className="px-3 pt-3">
                    <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-red-400">
                      Urgentes ({urgentes.length})
                    </p>
                    <div className="space-y-1.5">
                      {urgentes.map(({ lead }) => (
                        <AlertItem
                          key={lead.id}
                          lead={lead}
                          tipo="urgente"
                          daysInfo={getDaysInfo(lead, 'urgente')}
                          onNavigate={() => { router.push(`/leads/${lead.id}`); setOpen(false) }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Proximas */}
                {proximas.length > 0 && (
                  <div className="px-3 pt-3">
                    <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-yellow-400">
                      Proximos ({proximas.length})
                    </p>
                    <div className="space-y-1.5">
                      {proximas.map(({ lead }) => (
                        <AlertItem
                          key={lead.id}
                          lead={lead}
                          tipo="proximo"
                          daysInfo={getDaysInfo(lead, 'proximo')}
                          onNavigate={() => { router.push(`/leads/${lead.id}`); setOpen(false) }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Sin follow-up */}
                {sinFollowup.length > 0 && (
                  <div className="px-3 pt-3">
                    <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-telkora-muted">
                      Sin follow-up ({sinFollowup.length})
                    </p>
                    <div className="space-y-1.5">
                      {sinFollowup.map(({ lead }) => (
                        <AlertItem
                          key={lead.id}
                          lead={lead}
                          tipo="sin_followup"
                          daysInfo={getDaysInfo(lead, 'sin_followup')}
                          onNavigate={() => { router.push(`/leads/${lead.id}`); setOpen(false) }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {alertas.length > 0 && (
            <div className="border-t border-telkora-border px-4 py-2 text-center">
              <p className="text-[10px] text-telkora-muted">
                {alertas.length} alerta{alertas.length !== 1 ? 's' : ''} en total
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface AlertItemProps {
  lead: Lead
  tipo: string
  daysInfo: string
  onNavigate: () => void
}

function AlertItem({ lead, tipo, daysInfo, onNavigate }: AlertItemProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-telkora-border bg-telkora-card2 px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="truncate text-xs font-medium text-telkora-text">{lead.empresa}</p>
        <p className="text-[10px] text-telkora-muted">{daysInfo}</p>
      </div>
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${getTipoBadge(tipo)}`}>
        {getTipoLabel(tipo)}
      </span>
      <button
        onClick={onNavigate}
        className="shrink-0 text-telkora-muted hover:text-telkora-accent transition-colors"
        title="Ver lead"
      >
        <ExternalLink className="size-3.5" />
      </button>
    </div>
  )
}
