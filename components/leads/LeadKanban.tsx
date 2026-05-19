'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { LeadCard } from './LeadCard'
import { LeadFilters } from './LeadFilters'
import { LeadQuickView } from './LeadQuickView'
import { LeadForm } from './LeadForm'
import { ImportCSV } from './ImportCSV'
import { LeadListView } from './LeadListView'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatEUR, isFollowupUrgente } from '@/lib/utils'
import { ESTADOS_LEAD, ESTADOS_LEAD_ORDER } from '@/lib/constants'
import type { Lead, EstadoLead } from '@/types'
import type { Usuario } from '@/lib/profile'
import { differenceInDays } from 'date-fns'

interface LeadKanbanProps {
  leads: Lead[]
  currentUserId: string
  usuarios?: Usuario[]
  esAdmin?: boolean
  onUpdateEstado: (leadId: string, estado: EstadoLead, userId: string) => Promise<void>
  onUpdateFollowup?: (leadId: string, fecha: string | null) => Promise<void>
  onBulkUpdateEstado?: (ids: string[], estado: EstadoLead) => Promise<void>
  onBulkAssign?: (ids: string[], userId: string) => Promise<void>
  onCreateLead: (data: Partial<Lead>) => Promise<Lead | null>
  onRefresh: () => void
}

function KanbanColumn({
  estado,
  leads,
  usuarios,
  compact,
  onUpdateEstado,
  onUpdateFollowup,
  onQuickView,
}: {
  estado: EstadoLead
  leads: Lead[]
  usuarios: Usuario[]
  compact?: boolean
  onUpdateEstado?: (leadId: string, estado: EstadoLead) => void
  onUpdateFollowup?: (leadId: string, fecha: string | null) => void
  onQuickView?: (lead: Lead) => void
}) {
  const config = ESTADOS_LEAD[estado]
  const { setNodeRef, isOver } = useDroppable({ id: estado })
  const totalValor = leads.reduce((s, l) => s + (l.valor_estimado ?? 0), 0)
  const totalPonderado = leads.reduce((s, l) => s + (l.valor_ponderado ?? 0), 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-xl border transition-colors ${
        isOver ? 'border-telkora-accent/50 bg-telkora-card2' : 'border-telkora-border bg-telkora-card'
      }`}
      style={{ height: 'calc(100vh - 220px)' }}
    >
      {/* Column header */}
      <div className="shrink-0 p-3 pb-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-xs font-semibold text-telkora-text">{config.label}</span>
          </div>
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: config.bg, color: config.color }}
          >
            {leads.length}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <p className="text-[10px] text-telkora-muted">{formatEUR(totalValor)}</p>
          <span className="text-[10px] text-telkora-muted">·</span>
          <p className="text-[10px] text-telkora-muted">pond. {formatEUR(totalPonderado)}</p>
        </div>
      </div>

      {/* Separator */}
      <div className="mx-3 mt-2 mb-0 h-px bg-telkora-border" />

      {/* Cards — scrollable */}
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              usuarios={usuarios}
              compact={compact}
              onUpdateEstado={onUpdateEstado}
              onUpdateFollowup={onUpdateFollowup}
              onQuickView={onQuickView}
            />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-telkora-border">
            <span className="text-[10px] text-telkora-muted">Sin leads</span>
          </div>
        )}
      </div>
    </div>
  )
}

// "Mi Día" focus panel
function MiDiaPanel({
  leads,
  currentUserId,
  onUpdateEstado,
}: {
  leads: Lead[]
  currentUserId: string
  onUpdateEstado: (leadId: string, estado: EstadoLead) => void
}) {
  const ESTADOS_EXCLUIDOS: EstadoLead[] = ['cerrado_ganado', 'cerrado_perdido', 'pausado']
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const urgentes = useMemo(() => {
    return leads.filter((l) => {
      if (l.owner_id !== currentUserId) return false
      if (ESTADOS_EXCLUIDOS.includes(l.estado)) return false
      if (!l.proximo_followup) return false
      const f = new Date(l.proximo_followup)
      f.setHours(0, 0, 0, 0)
      return f <= hoy
    })
  }, [leads, currentUserId])

  const [expanded, setExpanded] = useState(urgentes.length > 0)
  const [estadoMenuId, setEstadoMenuId] = useState<string | null>(null)

  if (urgentes.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-telkora-border bg-telkora-card px-4 py-2">
        <span className="text-xs text-green-500 font-medium">Sin pendientes hoy</span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-telkora-border bg-telkora-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-telkora-card2"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-telkora-text">
            Mi dia — {urgentes.length} lead{urgentes.length !== 1 ? 's' : ''} requieren atención hoy
          </span>
          <span className="rounded-full bg-telkora-danger/20 px-1.5 py-0.5 text-[10px] font-bold text-telkora-danger">
            {urgentes.length}
          </span>
        </div>
        {expanded
          ? <ChevronUp className="size-4 text-telkora-muted" />
          : <ChevronDown className="size-4 text-telkora-muted" />
        }
      </button>

      {/* Cards */}
      {expanded && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          {urgentes.map((lead) => {
            const diasVencido = lead.proximo_followup
              ? Math.max(0, differenceInDays(new Date(), new Date(lead.proximo_followup)))
              : 0

            return (
              <div
                key={lead.id}
                className="relative shrink-0 w-52 rounded-lg border border-telkora-danger/30 bg-telkora-card2 p-3"
              >
                <p className="text-xs font-semibold text-telkora-text line-clamp-1">{lead.empresa}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <StatusBadge estado={lead.estado} />
                  {diasVencido > 0 && (
                    <span className="text-[10px] text-telkora-danger">+{diasVencido}d</span>
                  )}
                </div>
                <div className="relative mt-2">
                  <button
                    className="w-full rounded bg-telkora-card px-2 py-1 text-[10px] text-telkora-muted hover:bg-telkora-border hover:text-telkora-text"
                    onClick={() => setEstadoMenuId((v) => (v === lead.id ? null : lead.id))}
                  >
                    Cambiar estado
                  </button>
                  {estadoMenuId === lead.id && (
                    <div
                      className="absolute left-0 top-7 z-50 min-w-[170px] rounded-lg border border-telkora-border bg-telkora-card shadow-xl"
                      onMouseLeave={() => setEstadoMenuId(null)}
                    >
                      {ESTADOS_LEAD_ORDER.filter((e) => e !== lead.estado).map((estado) => {
                        const cfg = ESTADOS_LEAD[estado]
                        return (
                          <button
                            key={estado}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-telkora-card2"
                            onClick={() => {
                              onUpdateEstado(lead.id, estado)
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function LeadKanban({
  leads,
  currentUserId,
  usuarios = [],
  esAdmin = false,
  onUpdateEstado,
  onUpdateFollowup,
  onBulkUpdateEstado,
  onBulkAssign,
  onCreateLead,
  onRefresh,
}: LeadKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [quickViewLead, setQuickViewLead] = useState<Lead | null>(null)
  const [compact, setCompact] = useState(false)

  // Filter state
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('todos')
  const [fuente, setFuente] = useState('todas')
  const [prioridad, setPrioridad] = useState('todas')
  const [soloMios, setSoloMios] = useState(false)
  const [estadosFiltro, setEstadosFiltro] = useState<EstadoLead[]>([])
  const [valorMinimo, setValorMinimo] = useState(0)
  const [soloSinFollowup, setSoloSinFollowup] = useState(false)
  const [soloUrgentes, setSoloUrgentes] = useState(false)
  const [vista, setVista] = useState<'kanban' | 'lista'>('kanban')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (soloMios && l.owner_id !== currentUserId) return false
      if (sector !== 'todos' && l.sector !== sector) return false
      if (fuente !== 'todas' && l.fuente !== fuente) return false
      if (prioridad !== 'todas' && String(l.prioridad_score) !== prioridad) return false
      if (estadosFiltro.length > 0 && !estadosFiltro.includes(l.estado)) return false
      if (valorMinimo > 0 && (l.valor_estimado ?? 0) < valorMinimo) return false
      if (soloSinFollowup && l.proximo_followup) return false
      if (soloUrgentes && !isFollowupUrgente(l.proximo_followup)) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          l.empresa.toLowerCase().includes(q) ||
          (l.contacto?.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
  }, [leads, soloMios, sector, fuente, prioridad, estadosFiltro, valorMinimo, soloSinFollowup, soloUrgentes, search, currentUserId])

  const leadsByEstado = useMemo(() => {
    const map: Record<EstadoLead, Lead[]> = {} as Record<EstadoLead, Lead[]>
    for (const estado of ESTADOS_LEAD_ORDER) map[estado] = []
    for (const lead of filteredLeads) map[lead.estado]?.push(lead)
    return map
  }, [filteredLeads])

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    let nuevoEstado: EstadoLead | null = null
    if (ESTADOS_LEAD_ORDER.includes(over.id as EstadoLead)) {
      nuevoEstado = over.id as EstadoLead
    } else {
      const targetLead = leads.find((l) => l.id === over.id)
      if (targetLead && targetLead.estado !== lead.estado) {
        nuevoEstado = targetLead.estado
      }
    }

    if (nuevoEstado && nuevoEstado !== lead.estado) {
      await onUpdateEstado(leadId, nuevoEstado, currentUserId)
    }
  }

  async function handleCreateLead(data: Partial<Lead>) {
    await onCreateLead(data)
    setShowForm(false)
  }

  // Adapter: card-level estado change calls wrapper's onUpdateEstado
  function handleCardUpdateEstado(leadId: string, estado: EstadoLead) {
    onUpdateEstado(leadId, estado, currentUserId)
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <LeadFilters
        search={search} onSearchChange={setSearch}
        sector={sector} onSectorChange={setSector}
        fuente={fuente} onFuenteChange={setFuente}
        prioridad={prioridad} onPrioridadChange={setPrioridad}
        soloMios={soloMios} onSoloMiosChange={setSoloMios}
        estadosFiltro={estadosFiltro} onEstadosFiltroChange={setEstadosFiltro}
        valorMinimo={valorMinimo} onValorMinimoChange={setValorMinimo}
        soloSinFollowup={soloSinFollowup} onSoloSinFollowupChange={setSoloSinFollowup}
        soloUrgentes={soloUrgentes} onSoloUrgentesChange={setSoloUrgentes}
        onNuevoLead={() => setShowForm(true)}
        onImportar={() => setShowImport(true)}
        vista={vista} onVistaChange={setVista}
        compact={compact} onCompactChange={setCompact}
      />

      {/* Mi Día panel */}
      <MiDiaPanel
        leads={leads}
        currentUserId={currentUserId}
        onUpdateEstado={handleCardUpdateEstado}
      />

      {/* Board / List */}
      {vista === 'lista' ? (
        <div className="flex-1 overflow-y-auto pb-4">
          <LeadListView
            leads={filteredLeads}
            usuarios={usuarios}
            esAdmin={esAdmin}
            onUpdateEstado={handleCardUpdateEstado}
            onUpdateFollowup={onUpdateFollowup}
            onBulkUpdateEstado={onBulkUpdateEstado}
            onBulkAssign={onBulkAssign}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
              {ESTADOS_LEAD_ORDER.map((estado) => (
                <KanbanColumn
                  key={estado}
                  estado={estado}
                  leads={leadsByEstado[estado]}
                  usuarios={usuarios}
                  compact={compact}
                  onUpdateEstado={handleCardUpdateEstado}
                  onUpdateFollowup={onUpdateFollowup}
                  onQuickView={(lead) => setQuickViewLead(lead)}
                />
              ))}
            </div>
            <DragOverlay>
              {activeLead ? (
                <LeadCard lead={activeLead} usuarios={usuarios} />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      <LeadForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreateLead}
        usuarios={usuarios}
        currentUserId={currentUserId}
        esAdmin={esAdmin}
      />
      <ImportCSV
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={onRefresh}
      />

      <LeadQuickView
        lead={quickViewLead}
        usuarios={usuarios}
        onClose={() => setQuickViewLead(null)}
        onUpdateEstado={handleCardUpdateEstado}
        onUpdateFollowup={(leadId, fecha) => onUpdateFollowup?.(leadId, fecha)}
      />
    </div>
  )
}
