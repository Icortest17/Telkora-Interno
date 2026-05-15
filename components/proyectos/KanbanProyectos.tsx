'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProyectoCard } from './ProyectoCard'
import { ProyectoForm } from './ProyectoForm'
import { ESTADOS_PROYECTO, ESTADOS_PROYECTO_ORDER, type EstadoProyecto } from '@/lib/constants'
import { formatEUR } from '@/lib/utils'
import type { Proyecto, Cliente } from '@/types'
import type { Usuario } from '@/lib/profile'

interface KanbanProyectosProps {
  proyectos: Proyecto[]
  clientes: Pick<Cliente, 'id' | 'empresa'>[]
  currentUserId: string
  usuarios?: Usuario[]
  esAdmin?: boolean
}

function ProyectoColumn({
  estado,
  proyectos,
  clienteMap,
  onCardClick,
}: {
  estado: EstadoProyecto
  proyectos: Proyecto[]
  clienteMap: Map<string, string>
  onCardClick: (id: string) => void
}) {
  const config = ESTADOS_PROYECTO[estado]
  const { setNodeRef, isOver } = useDroppable({ id: estado })
  const totalPresupuesto = proyectos.reduce((s, p) => s + (p.presupuesto ?? 0), 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex w-60 shrink-0 flex-col rounded-xl border transition-colors ${
        isOver ? 'border-telkora-accent/50 bg-telkora-card2' : 'border-telkora-border bg-telkora-card'
      }`}
    >
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
          <span className="text-xs font-medium text-telkora-text">{config.label}</span>
        </div>
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: config.bg, color: config.color }}
        >
          {proyectos.length}
        </span>
      </div>
      <div className="px-3 pb-2">
        <p className="text-[10px] text-telkora-muted">{formatEUR(totalPresupuesto)}</p>
      </div>
      <div className="min-h-[100px] flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        <SortableContext items={proyectos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {proyectos.map((proyecto) => (
            <ProyectoCard
              key={proyecto.id}
              proyecto={proyecto}
              clienteNombre={clienteMap.get(proyecto.cliente_id)}
              onClick={() => onCardClick(proyecto.id)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

export function KanbanProyectos({ proyectos: initialProyectos, clientes, currentUserId, usuarios = [], esAdmin = false }: KanbanProyectosProps) {
  const supabase = createClient()
  const router = useRouter()
  const [proyectos, setProyectos] = useState<Proyecto[]>(initialProyectos)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const clienteMap = useMemo(
    () => new Map(clientes.map((c) => [c.id, c.empresa])),
    [clientes]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const proyectosByEstado = useMemo(() => {
    const map = {} as Record<EstadoProyecto, Proyecto[]>
    for (const e of ESTADOS_PROYECTO_ORDER) map[e] = []
    for (const p of proyectos) map[p.estado]?.push(p)
    return map
  }, [proyectos])

  const activeProyecto = activeId ? proyectos.find((p) => p.id === activeId) : null

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return

    const proyecto = proyectos.find((p) => p.id === active.id)
    if (!proyecto) return

    let nuevoEstado: EstadoProyecto | null = null
    if ((ESTADOS_PROYECTO_ORDER as readonly string[]).includes(over.id as string)) {
      nuevoEstado = over.id as EstadoProyecto
    } else {
      const target = proyectos.find((p) => p.id === over.id)
      if (target && target.estado !== proyecto.estado) nuevoEstado = target.estado
    }

    if (nuevoEstado && nuevoEstado !== proyecto.estado) {
      setProyectos((prev) =>
        prev.map((p) => (p.id === proyecto.id ? { ...p, estado: nuevoEstado! } : p))
      )
      const { error } = await supabase
        .from('proyectos')
        .update({ estado: nuevoEstado })
        .eq('id', proyecto.id)
      if (error) {
        setProyectos((prev) =>
          prev.map((p) => (p.id === proyecto.id ? { ...p, estado: proyecto.estado } : p))
        )
        toast.error('Error actualizando estado')
      }
    }
  }

  async function handleCreateProyecto(data: Partial<Proyecto>) {
    const ownerId = data.owner_id || currentUserId
    const { data: nuevo, error } = await supabase
      .from('proyectos')
      .insert({ ...data, owner_id: ownerId, responsable_id: ownerId })
      .select()
      .single()
    if (error) { toast.error('Error creando proyecto'); return }
    setProyectos((prev) => [nuevo, ...prev])
    toast.success('Proyecto creado')
    setShowForm(false)
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-telkora-muted">
            {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}
          </h2>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="h-8 bg-telkora-accent text-xs font-semibold text-telkora-bg hover:bg-telkora-accent2"
        >
          <Plus className="mr-1.5 size-3.5" />
          Nuevo proyecto
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {ESTADOS_PROYECTO_ORDER.map((estado) => (
              <ProyectoColumn
                key={estado}
                estado={estado}
                proyectos={proyectosByEstado[estado]}
                clienteMap={clienteMap}
                onCardClick={(id) => router.push('/proyectos/' + id)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeProyecto ? (
              <ProyectoCard
                proyecto={activeProyecto}
                clienteNombre={clienteMap.get(activeProyecto.cliente_id)}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <ProyectoForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreateProyecto}
        clientes={clientes}
        usuarios={usuarios}
        currentUserId={currentUserId}
        esAdmin={esAdmin}
      />
    </div>
  )
}
