'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, ChevronsUpDown, Calendar, RefreshCw, ExternalLink } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityScore } from '@/components/shared/PriorityScore'
import { formatEUR, formatDate, isFollowupUrgente, getInitials } from '@/lib/utils'
import { ESTADOS_LEAD, ESTADOS_LEAD_ORDER } from '@/lib/constants'
import type { Lead, EstadoLead } from '@/types'
import type { Usuario } from '@/lib/profile'
import { differenceInDays } from 'date-fns'

type SortKey =
  | 'empresa'
  | 'estado'
  | 'valor_estimado'
  | 'valor_ponderado'
  | 'proximo_followup'
  | 'sector'
  | 'fuente'
  | 'prioridad_score'
  | 'dias_pipeline'
type SortDir = 'asc' | 'desc'

export interface LeadListViewProps {
  leads: Lead[]
  usuarios?: Usuario[]
  esAdmin?: boolean
  onUpdateEstado?: (leadId: string, estado: EstadoLead) => void
  onUpdateFollowup?: (leadId: string, fecha: string | null) => void
  onBulkUpdateEstado?: (ids: string[], estado: EstadoLead) => void
  onBulkAssign?: (ids: string[], userId: string) => void
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="ml-1 inline size-3 opacity-40" />
  return sortDir === 'asc'
    ? <ChevronUp className="ml-1 inline size-3" />
    : <ChevronDown className="ml-1 inline size-3" />
}

function getDiasPipeline(lead: Lead): number {
  const ref = lead.fecha_primer_contacto ?? lead.created_at
  if (!ref) return 0
  return Math.max(0, differenceInDays(new Date(), new Date(ref)))
}

function exportCSV(leads: Lead[]) {
  const header = ['empresa', 'contacto', 'estado', 'valor_estimado', 'sector', 'fuente', 'proximo_followup', 'owner_id']
  const rows = leads.map((l) => [
    `"${(l.empresa ?? '').replace(/"/g, '""')}"`,
    `"${(l.contacto ?? '').replace(/"/g, '""')}"`,
    l.estado,
    l.valor_estimado ?? 0,
    l.sector ?? '',
    l.fuente ?? '',
    l.proximo_followup ?? '',
    l.owner_id ?? '',
  ])
  const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
}

export function LeadListView({
  leads,
  usuarios = [],
  esAdmin = false,
  onUpdateEstado,
  onUpdateFollowup,
  onBulkUpdateEstado,
  onBulkAssign,
}: LeadListViewProps) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('prioridad_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Inline followup editing
  const [editingFollowupId, setEditingFollowupId] = useState<string | null>(null)
  const [followupEditValue, setFollowupEditValue] = useState('')

  // Inline estado change per row
  const [estadoMenuId, setEstadoMenuId] = useState<string | null>(null)
  const estadoMenuRef = useRef<HTMLDivElement>(null)

  // Bulk action menus
  const [showBulkEstado, setShowBulkEstado] = useState(false)
  const [showBulkAssign, setShowBulkAssign] = useState(false)

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
        case 'valor_ponderado':
          aVal = a.valor_ponderado
          bVal = b.valor_ponderado
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
        case 'dias_pipeline':
          aVal = getDiasPipeline(a)
          bVal = getDiasPipeline(b)
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

  function toggleSelectAll() {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sorted.map((l) => l.id)))
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  function handleFollowupSave(leadId: string) {
    onUpdateFollowup?.(leadId, followupEditValue || null)
    setEditingFollowupId(null)
  }

  type ThKey = SortKey
  const COLUMNS: { key: ThKey; label: string; className?: string }[] = [
    { key: 'empresa', label: 'Empresa' },
    { key: 'estado', label: 'Estado' },
    { key: 'valor_estimado', label: 'Valor' },
    { key: 'valor_ponderado', label: 'Pond.' },
    { key: 'proximo_followup', label: 'Follow-up' },
    { key: 'sector', label: 'Sector' },
    { key: 'fuente', label: 'Fuente' },
    { key: 'dias_pipeline', label: 'Días pipeline' },
    { key: 'prioridad_score', label: 'Prioridad' },
  ]

  const selectedLeads = sorted.filter((l) => selectedIds.has(l.id))

  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-telkora-muted">Sin leads para mostrar</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-telkora-accent/30 bg-telkora-card2 px-4 py-2">
          <span className="text-xs font-medium text-telkora-text">
            {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <span className="text-telkora-border">·</span>

          {/* Bulk estado */}
          <div className="relative">
            <button
              className="flex items-center gap-1 rounded border border-telkora-border bg-telkora-card px-2.5 py-1 text-xs text-telkora-muted hover:text-telkora-text"
              onClick={() => { setShowBulkEstado((v) => !v); setShowBulkAssign(false) }}
            >
              Cambiar estado
              <ChevronDown className="size-3" />
            </button>
            {showBulkEstado && (
              <div className="absolute left-0 top-8 z-50 min-w-[180px] rounded-lg border border-telkora-border bg-telkora-card shadow-xl">
                {ESTADOS_LEAD_ORDER.map((estado) => {
                  const cfg = ESTADOS_LEAD[estado]
                  return (
                    <button
                      key={estado}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-telkora-card2"
                      onClick={() => {
                        onBulkUpdateEstado?.(Array.from(selectedIds), estado)
                        setSelectedIds(new Set())
                        setShowBulkEstado(false)
                      }}
                    >
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                      <span style={{ color: cfg.color }}>{cfg.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bulk assign */}
          {esAdmin && usuarios.length > 0 && (
            <div className="relative">
              <button
                className="flex items-center gap-1 rounded border border-telkora-border bg-telkora-card px-2.5 py-1 text-xs text-telkora-muted hover:text-telkora-text"
                onClick={() => { setShowBulkAssign((v) => !v); setShowBulkEstado(false) }}
              >
                Asignar a
                <ChevronDown className="size-3" />
              </button>
              {showBulkAssign && (
                <div className="absolute left-0 top-8 z-50 min-w-[160px] rounded-lg border border-telkora-border bg-telkora-card shadow-xl">
                  {usuarios.map((u) => (
                    <button
                      key={u.userId}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-telkora-text hover:bg-telkora-card2"
                      onClick={() => {
                        onBulkAssign?.(Array.from(selectedIds), u.userId)
                        setSelectedIds(new Set())
                        setShowBulkAssign(false)
                      }}
                    >
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-telkora-card2 text-[9px] ring-1 ring-telkora-border">
                        {getInitials(u.nombre)}
                      </div>
                      {u.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Export */}
          <button
            className="flex items-center gap-1 rounded border border-telkora-border bg-telkora-card px-2.5 py-1 text-xs text-telkora-muted hover:text-telkora-text"
            onClick={() => exportCSV(selectedLeads)}
          >
            Exportar CSV
          </button>

          {/* Deselect */}
          <button
            className="ml-auto text-xs text-telkora-muted hover:text-telkora-text"
            onClick={() => setSelectedIds(new Set())}
          >
            Deseleccionar
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-telkora-border">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-telkora-border bg-telkora-card">
              {/* Checkbox header */}
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size === sorted.length && sorted.length > 0}
                  onChange={toggleSelectAll}
                  className="size-3.5 cursor-pointer accent-telkora-accent"
                />
              </th>
              {COLUMNS.map(({ key, label }) => (
                <th key={key} className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort(key)}
                    className="flex items-center text-xs font-medium text-telkora-muted transition-colors hover:text-telkora-text"
                  >
                    {label}
                    <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
              ))}
              {/* Actions column */}
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium text-telkora-muted">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((lead, idx) => {
              const urgente = isFollowupUrgente(lead.proximo_followup)
              const isHovered = hoveredId === lead.id
              const isSelected = selectedIds.has(lead.id)
              const diasPipeline = getDiasPipeline(lead)
              const ownerNombre = usuarios.find(
                (u) => u.userId === lead.owner_id || u.userId === lead.responsable_id
              )?.nombre

              return (
                <tr
                  key={lead.id}
                  onMouseEnter={() => setHoveredId(lead.id)}
                  onMouseLeave={() => { setHoveredId(null); setEstadoMenuId(null) }}
                  onClick={() => {
                    if (estadoMenuId || editingFollowupId) return
                    router.push('/leads/' + lead.id)
                  }}
                  className={`cursor-pointer transition-colors ${
                    idx !== sorted.length - 1 ? 'border-b border-telkora-border' : ''
                  } ${isSelected ? 'bg-telkora-accent/5' : isHovered ? 'bg-telkora-card2' : ''}`}
                >
                  {/* Checkbox */}
                  <td
                    className="px-3 py-3"
                    onClick={(e) => { e.stopPropagation(); toggleSelect(lead.id) }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(lead.id)}
                      className="size-3.5 cursor-pointer accent-telkora-accent"
                    />
                  </td>

                  {/* Empresa */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-telkora-text">{lead.empresa}</span>
                    {lead.contacto && (
                      <p className="mt-0.5 text-xs text-telkora-muted">{lead.contacto}</p>
                    )}
                    {ownerNombre && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <div className="flex size-4 items-center justify-center rounded-full bg-telkora-card2 text-[8px] text-telkora-muted ring-1 ring-telkora-border">
                          {getInitials(ownerNombre)}
                        </div>
                        <span className="text-[10px] text-telkora-muted">{ownerNombre}</span>
                      </div>
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

                  {/* Valor ponderado */}
                  <td className="px-4 py-3 text-xs text-telkora-muted">
                    {formatEUR(lead.valor_ponderado)}
                  </td>

                  {/* Follow-up */}
                  <td className={`px-4 py-3 text-xs ${urgente ? 'text-telkora-danger' : 'text-telkora-text'}`}>
                    {editingFollowupId === lead.id ? (
                      <input
                        type="date"
                        value={followupEditValue}
                        onChange={(e) => setFollowupEditValue(e.target.value)}
                        onBlur={() => handleFollowupSave(lead.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFollowupSave(lead.id)
                          if (e.key === 'Escape') setEditingFollowupId(null)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border border-telkora-border bg-telkora-card px-2 py-0.5 text-xs text-telkora-text focus:outline-none focus:ring-1 focus:ring-telkora-accent"
                        autoFocus
                      />
                    ) : (
                      formatDate(lead.proximo_followup)
                    )}
                  </td>

                  {/* Sector */}
                  <td className="px-4 py-3 text-xs text-telkora-muted">{lead.sector ?? '—'}</td>

                  {/* Fuente */}
                  <td className="px-4 py-3 text-xs text-telkora-muted">{lead.fuente ?? '—'}</td>

                  {/* Días pipeline */}
                  <td className="px-4 py-3 text-xs text-telkora-muted">{diasPipeline}d</td>

                  {/* Prioridad / Actions */}
                  <td className="relative px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {isHovered ? (
                      <div className="flex items-center gap-1">
                        {/* Edit followup */}
                        <button
                          title="Editar follow-up"
                          className="flex size-6 items-center justify-center rounded hover:bg-telkora-card"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFollowupEditValue(lead.proximo_followup?.slice(0, 10) ?? '')
                            setEditingFollowupId(lead.id)
                          }}
                        >
                          <Calendar className="size-3.5 text-telkora-muted" />
                        </button>

                        {/* Change estado */}
                        <div className="relative">
                          <button
                            title="Cambiar estado"
                            className="flex size-6 items-center justify-center rounded hover:bg-telkora-card"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEstadoMenuId((v) => (v === lead.id ? null : lead.id))
                            }}
                          >
                            <RefreshCw className="size-3.5 text-telkora-muted" />
                          </button>

                          {estadoMenuId === lead.id && (
                            <div
                              ref={estadoMenuRef}
                              className="absolute right-0 top-7 z-50 min-w-[170px] rounded-lg border border-telkora-border bg-telkora-card shadow-xl"
                            >
                              {ESTADOS_LEAD_ORDER.filter((e) => e !== lead.estado).map((estado) => {
                                const cfg = ESTADOS_LEAD[estado]
                                return (
                                  <button
                                    key={estado}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-telkora-card2"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onUpdateEstado?.(lead.id, estado)
                                      setEstadoMenuId(null)
                                    }}
                                  >
                                    <span className="size-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                                    <span style={{ color: cfg.color }}>{cfg.label}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* Navigate */}
                        <button
                          title="Ver detalle"
                          className="flex size-6 items-center justify-center rounded hover:bg-telkora-card"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push('/leads/' + lead.id)
                          }}
                        >
                          <ExternalLink className="size-3.5 text-telkora-muted" />
                        </button>
                      </div>
                    ) : (
                      <PriorityScore score={lead.prioridad_score} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
