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
import { LeadCard } from './LeadCard'
import { LeadFilters } from './LeadFilters'
import { LeadForm } from './LeadForm'
import { ImportCSV } from './ImportCSV'
import { formatEUR } from '@/lib/utils'
import { ESTADOS_LEAD, ESTADOS_LEAD_ORDER } from '@/lib/constants'
import type { Lead, EstadoLead } from '@/types'
import type { Usuario } from '@/lib/profile'

interface LeadKanbanProps {
  leads: Lead[]
  currentUserId: string
  usuarios?: Usuario[]
  esAdmin?: boolean
  onUpdateEstado: (leadId: string, estado: EstadoLead, userId: string) => Promise<void>
  onCreateLead: (data: Partial<Lead>) => Promise<Lead | null>
  onRefresh: () => void
}

function KanbanColumn({
  estado,
  leads,
}: {
  estado: EstadoLead
  leads: Lead[]
}) {
  const config = ESTADOS_LEAD[estado]
  const { setNodeRef, isOver } = useDroppable({ id: estado })
  const total = leads.reduce((s, l) => s + (l.valor_estimado ?? 0), 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-xl border transition-colors ${
        isOver ? 'border-telkora-accent/50 bg-telkora-card2' : 'border-telkora-border bg-telkora-card'
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-xs font-medium text-telkora-text">{config.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: config.bg, color: config.color }}
          >
            {leads.length}
          </span>
        </div>
      </div>
      <div className="px-3 pb-2">
        <p className="text-[10px] text-telkora-muted">{formatEUR(total)}</p>
      </div>

      {/* Cards */}
      <div className="min-h-[100px] flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

export function LeadKanban({
  leads,
  currentUserId,
  usuarios = [],
  esAdmin = false,
  onUpdateEstado,
  onCreateLead,
  onRefresh,
}: LeadKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('todos')
  const [fuente, setFuente] = useState('todas')
  const [prioridad, setPrioridad] = useState('todas')
  const [soloMios, setSoloMios] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (soloMios && l.responsable_id !== currentUserId) return false
      if (sector !== 'todos' && l.sector !== sector) return false
      if (fuente !== 'todas' && l.fuente !== fuente) return false
      if (prioridad !== 'todas' && String(l.prioridad_score) !== prioridad) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          l.empresa.toLowerCase().includes(q) ||
          (l.contacto?.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
  }, [leads, soloMios, sector, fuente, prioridad, search, currentUserId])

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

    // Check if dropped over a column (estado) or another card
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

  return (
    <div className="flex h-full flex-col gap-4">
      <LeadFilters
        search={search} onSearchChange={setSearch}
        sector={sector} onSectorChange={setSector}
        fuente={fuente} onFuenteChange={setFuente}
        prioridad={prioridad} onPrioridadChange={setPrioridad}
        soloMios={soloMios} onSoloMiosChange={setSoloMios}
        onNuevoLead={() => setShowForm(true)}
        onImportar={() => setShowImport(true)}
      />

      {/* Kanban board */}
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
              />
            ))}
          </div>
          <DragOverlay>
            {activeLead ? <LeadCard lead={activeLead} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

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
    </div>
  )
}
