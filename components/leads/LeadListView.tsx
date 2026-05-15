'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityScore } from '@/components/shared/PriorityScore'
import { formatEUR, formatDate, isFollowupUrgente } from '@/lib/utils'
import type { Lead } from '@/types'

type SortKey = 'empresa' | 'estado' | 'valor_estimado' | 'proximo_followup' | 'sector' | 'fuente' | 'prioridad_score'
type SortDir = 'asc' | 'desc'

interface LeadListViewProps {
  leads: Lead[]
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="ml-1 inline size-3 opacity-40" />
  return sortDir === 'asc'
    ? <ChevronUp className="ml-1 inline size-3" />
    : <ChevronDown className="ml-1 inline size-3" />
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'empresa',          label: 'Empresa' },
  { key: 'estado',           label: 'Estado' },
  { key: 'valor_estimado',   label: 'Valor estimado' },
  { key: 'proximo_followup', label: 'Próximo follow-up' },
  { key: 'sector',           label: 'Sector' },
  { key: 'fuente',           label: 'Fuente' },
  { key: 'prioridad_score',  label: 'Prioridad' },
]

export function LeadListView({ leads }: LeadListViewProps) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('prioridad_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(col: SortKey) {
    if (col === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(col)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    return [...leads].sort((a, b) => {
      let aVal: string | number | null = null
      let bVal: string | number | null = null

      switch (sortKey) {
        case 'empresa':
          aVal = a.empresa.toLowerCase()
          bVal = b.empresa.toLowerCase()
          break
        case 'estado':
          aVal = a.estado
          bVal = b.estado
          break
        case 'valor_estimado':
          aVal = a.valor_estimado
          bVal = b.valor_estimado
          break
        case 'proximo_followup':
          aVal = a.proximo_followup ?? ''
          bVal = b.proximo_followup ?? ''
          break
        case 'sector':
          aVal = a.sector ?? ''
          bVal = b.sector ?? ''
          break
        case 'fuente':
          aVal = a.fuente ?? ''
          bVal = b.fuente ?? ''
          break
        case 'prioridad_score':
          aVal = a.prioridad_score
          bVal = b.prioridad_score
          break
        default:
          return 0
      }

      if (aVal === null || aVal === '') return 1
      if (bVal === null || bVal === '') return -1

      let cmp: number
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal
      } else {
        cmp = String(aVal).localeCompare(String(bVal), 'es')
      }

      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [leads, sortKey, sortDir])

  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-telkora-muted">Sin leads para mostrar</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-telkora-border">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-telkora-border bg-telkora-card">
            {COLUMNS.map(({ key, label }) => (
              <th
                key={key}
                className="px-4 py-3 text-left"
              >
                <button
                  onClick={() => handleSort(key)}
                  className="flex items-center text-xs font-medium text-telkora-muted hover:text-telkora-text transition-colors"
                >
                  {label}
                  <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((lead, idx) => {
            const urgente = isFollowupUrgente(lead.proximo_followup)
            return (
              <tr
                key={lead.id}
                onClick={() => router.push('/leads/' + lead.id)}
                className={`cursor-pointer transition-colors hover:bg-telkora-card2 ${
                  idx !== sorted.length - 1 ? 'border-b border-telkora-border' : ''
                }`}
              >
                {/* Empresa */}
                <td className="px-4 py-3">
                  <span className="font-medium text-telkora-text">{lead.empresa}</span>
                  {lead.contacto && (
                    <p className="mt-0.5 text-xs text-telkora-muted">{lead.contacto}</p>
                  )}
                </td>

                {/* Estado */}
                <td className="px-4 py-3">
                  <StatusBadge estado={lead.estado} />
                </td>

                {/* Valor estimado */}
                <td className="px-4 py-3 text-xs text-telkora-text">
                  {formatEUR(lead.valor_estimado)}
                </td>

                {/* Próximo follow-up */}
                <td className={`px-4 py-3 text-xs ${urgente ? 'text-telkora-danger' : 'text-telkora-text'}`}>
                  {formatDate(lead.proximo_followup)}
                </td>

                {/* Sector */}
                <td className="px-4 py-3 text-xs text-telkora-muted">
                  {lead.sector ?? '—'}
                </td>

                {/* Fuente */}
                <td className="px-4 py-3 text-xs text-telkora-muted">
                  {lead.fuente ?? '—'}
                </td>

                {/* Prioridad */}
                <td className="px-4 py-3">
                  <PriorityScore score={lead.prioridad_score} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
