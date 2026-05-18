'use client'

import Link from 'next/link'
import { CalendarDays, AlertCircle, ExternalLink } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import type { Lead } from '@/types'

interface GrupoFollowup {
  label: string
  leads: Lead[]
  urgente?: boolean
}

interface CalendarioClientProps {
  grupos: GrupoFollowup[]
}

export function CalendarioClient({ grupos }: CalendarioClientProps) {
  const totalLeads = grupos.reduce((s, g) => s + g.leads.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-telkora-text">Calendario de Follow-ups</h1>
          <p className="mt-0.5 text-xs text-telkora-muted">
            {totalLeads} leads con seguimiento pendiente
          </p>
        </div>
        <Link
          href="/leads"
          className="rounded-lg border border-telkora-border bg-telkora-card px-3 py-1.5 text-xs text-telkora-muted hover:border-telkora-accent hover:text-telkora-accent transition-colors"
        >
          Ver pipeline completo
        </Link>
      </div>

      {totalLeads === 0 ? (
        <div className="rounded-xl border border-telkora-border bg-telkora-card p-12 text-center">
          <CalendarDays className="mx-auto mb-3 size-8 text-telkora-muted/50" />
          <p className="text-sm font-medium text-telkora-text">Sin follow-ups pendientes</p>
          <p className="mt-1 text-xs text-telkora-muted">
            Todos los leads están al día o no tienen fecha de seguimiento asignada
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map((grupo) => {
            if (grupo.leads.length === 0) return null
            return (
              <section key={grupo.label}>
                <div className="mb-3 flex items-center gap-2">
                  {grupo.urgente && (
                    <AlertCircle className="size-4 text-telkora-danger" />
                  )}
                  <h2 className={`text-sm font-semibold ${grupo.urgente ? 'text-telkora-danger' : 'text-telkora-text'}`}>
                    {grupo.label}
                  </h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    grupo.urgente
                      ? 'bg-telkora-danger/15 text-telkora-danger'
                      : 'bg-telkora-card2 text-telkora-muted'
                  }`}>
                    {grupo.leads.length}
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-telkora-border bg-telkora-card">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-telkora-border">
                        <th className="px-4 py-2.5 text-left font-medium text-telkora-muted">Empresa</th>
                        <th className="px-4 py-2.5 text-left font-medium text-telkora-muted">Estado</th>
                        <th className="px-4 py-2.5 text-left font-medium text-telkora-muted">Contacto</th>
                        <th className="px-4 py-2.5 text-left font-medium text-telkora-muted">Follow-up</th>
                        <th className="px-4 py-2.5 text-right font-medium text-telkora-muted">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.leads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="border-b border-telkora-border/50 last:border-0 hover:bg-telkora-card2/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/leads/${lead.id}`}
                              className="font-medium text-telkora-text hover:text-telkora-accent"
                            >
                              {lead.empresa}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge estado={lead.estado} />
                          </td>
                          <td className="px-4 py-3 text-telkora-muted">
                            {lead.contacto ?? '—'}
                          </td>
                          <td className={`px-4 py-3 font-medium ${grupo.urgente ? 'text-telkora-danger' : 'text-telkora-text'}`}>
                            {formatDate(lead.proximo_followup)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/leads/${lead.id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-telkora-border px-2.5 py-1 text-telkora-muted hover:border-telkora-accent hover:text-telkora-accent transition-colors"
                            >
                              <ExternalLink className="size-3" />
                              Ver lead
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
