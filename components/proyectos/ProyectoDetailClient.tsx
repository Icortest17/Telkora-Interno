'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Calendar, CircleDollarSign, Percent, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ESTADOS_PROYECTO,
  ESTADOS_PROYECTO_ORDER,
  TIPOS_PROYECTO,
  PRIORIDADES_PROYECTO,
  type EstadoProyecto,
} from '@/lib/constants'
import { formatEUR, formatDate } from '@/lib/utils'
import type { Proyecto, Transaccion } from '@/types'
import type { Usuario } from '@/lib/profile'

const PRIORIDAD_COLOR: Record<string, string> = {
  alta: '#FF4444',
  media: '#FFD700',
  baja: '#888888',
}

const TRANSACCION_ESTADO_COLOR: Record<string, string> = {
  pendiente: '#FFD700',
  enviada: '#4A9EFF',
  cobrada: '#00CC6A',
  vencida: '#FF4444',
}

interface Props {
  proyecto: Proyecto
  cliente: { id: string; empresa: string } | null
  transacciones: Transaccion[]
  esAdmin: boolean
  usuarios: Usuario[]
}

export function ProyectoDetailClient({ proyecto: initialProyecto, cliente, transacciones: initialTransacciones, esAdmin, usuarios }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [proyecto, setProyecto] = useState<Proyecto>(initialProyecto)
  const [nombre, setNombre] = useState(initialProyecto.nombre)
  const [descripcion, setDescripcion] = useState(initialProyecto.descripcion ?? '')
  const [tipoProyecto, setTipoProyecto] = useState(initialProyecto.tipo_proyecto ?? '')
  const [fechaInicio, setFechaInicio] = useState(initialProyecto.fecha_inicio ?? '')
  const [fechaEntrega, setFechaEntrega] = useState(initialProyecto.fecha_entrega_estimada ?? '')
  const [porcentaje, setPorcentaje] = useState(String(initialProyecto.porcentaje_completado))
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [savedState, setSavedState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [transacciones, setTransacciones] = useState<Transaccion[]>(initialTransacciones)

  // Registrar cobro inline form
  const [showCobro, setShowCobro] = useState(false)
  const [cobroConcepto, setCobroConcepto] = useState(`Cobro - ${initialProyecto.nombre}`)
  const [cobroImporte, setCobroImporte] = useState(String(initialProyecto.presupuesto ?? ''))
  const [cobroEstado, setCobroEstado] = useState<'pendiente' | 'enviada' | 'cobrada'>('pendiente')
  const [cobroFecha, setCobroFecha] = useState('')
  const [isSavingCobro, setIsSavingCobro] = useState(false)

  async function handleRegistrarCobro(e: React.FormEvent) {
    e.preventDefault()
    setIsSavingCobro(true)
    try {
      const { data: nueva, error } = await supabase
        .from('transacciones')
        .insert({
          concepto: cobroConcepto.trim() || `Cobro - ${proyecto.nombre}`,
          importe: Number(cobroImporte) || 0,
          tipo: 'ingreso',
          estado: cobroEstado,
          fecha_cobro: cobroFecha || null,
          proyecto_id: proyecto.id,
          cliente_id: proyecto.cliente_id,
          owner_id: proyecto.owner_id,
          es_recurrente: false,
        })
        .select()
        .single()
      if (error) throw error
      setTransacciones((prev) => [nueva as Transaccion, ...prev])
      toast.success('Cobro registrado')
      setShowCobro(false)
      setCobroConcepto(`Cobro - ${proyecto.nombre}`)
      setCobroImporte(String(proyecto.presupuesto ?? ''))
      setCobroEstado('pendiente')
      setCobroFecha('')
    } catch {
      toast.error('Error registrando cobro')
    } finally {
      setIsSavingCobro(false)
    }
  }

  const estadoConfig = ESTADOS_PROYECTO[proyecto.estado]
  const prioridadColor = PRIORIDAD_COLOR[proyecto.prioridad]

  // Debounced auto-save for nombre, descripcion, porcentaje_completado
  useEffect(() => {
    clearTimeout(debounceRef.current)
    const porcentajeNum = Math.min(100, Math.max(0, Number(porcentaje) || 0))
    const hasChange =
      nombre !== proyecto.nombre ||
      descripcion !== (proyecto.descripcion ?? '') ||
      porcentajeNum !== proyecto.porcentaje_completado
    if (!hasChange) return
    setSavedState('saving')
    debounceRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from('proyectos')
        .update({
          nombre: nombre.trim() || proyecto.nombre,
          descripcion: descripcion || null,
          porcentaje_completado: porcentajeNum,
        })
        .eq('id', proyecto.id)
      if (!error) {
        setProyecto((prev) => ({
          ...prev,
          nombre: nombre.trim() || prev.nombre,
          descripcion: descripcion || null,
          porcentaje_completado: porcentajeNum,
        }))
        setSavedState('saved')
        clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSavedState('idle'), 2000)
      } else {
        setSavedState('idle')
      }
    }, 1000)
    return () => clearTimeout(debounceRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre, descripcion, porcentaje])

  async function handleDeleteProyecto() {
    if (!window.confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) return
    setIsDeleting(true)
    try {
      // Desvincula transacciones ligadas a este proyecto (FK NO ACTION)
      await supabase.from('transacciones').update({ proyecto_id: null }).eq('proyecto_id', proyecto.id)
      const { error } = await supabase.from('proyectos').delete().eq('id', proyecto.id)
      if (error) throw error
      toast.success('Proyecto eliminado')
      router.push('/proyectos')
    } catch {
      toast.error('Error eliminando proyecto')
      setIsDeleting(false)
    }
  }

  async function handleUpdateOwner(userId: string | null) {
    if (!userId) return
    const { error } = await supabase
      .from('proyectos')
      .update({ owner_id: userId })
      .eq('id', proyecto.id)
    if (error) {
      toast.error('Error actualizando responsable')
    } else {
      setProyecto((prev) => ({ ...prev, owner_id: userId }))
      toast.success('Responsable actualizado')
    }
  }

  async function handleUpdateEstado(v: string | null) {
    const nuevoEstado = (v ?? proyecto.estado) as EstadoProyecto
    if (nuevoEstado === proyecto.estado) return
    setProyecto((prev) => ({ ...prev, estado: nuevoEstado }))
    const { error } = await supabase
      .from('proyectos')
      .update({ estado: nuevoEstado })
      .eq('id', proyecto.id)
    if (error) {
      setProyecto((prev) => ({ ...prev, estado: proyecto.estado }))
      toast.error('Error actualizando estado')
    } else {
      toast.success('Estado actualizado')
    }
  }

  async function handleGuardar() {
    setIsSaving(true)
    const porcentajeNum = Math.min(100, Math.max(0, Number(porcentaje) || 0))
    try {
      const { error } = await supabase
        .from('proyectos')
        .update({
          nombre: nombre.trim() || proyecto.nombre,
          descripcion: descripcion || null,
          tipo_proyecto: tipoProyecto || null,
          fecha_inicio: fechaInicio || null,
          fecha_entrega_estimada: fechaEntrega || null,
          porcentaje_completado: porcentajeNum,
        })
        .eq('id', proyecto.id)
      if (error) throw error
      setProyecto((prev) => ({
        ...prev,
        nombre: nombre.trim() || prev.nombre,
        descripcion: descripcion || null,
        tipo_proyecto: tipoProyecto || null,
        fecha_inicio: fechaInicio || null,
        fecha_entrega_estimada: fechaEntrega || null,
        porcentaje_completado: porcentajeNum,
      }))
      setPorcentaje(String(porcentajeNum))
      toast.success('Cambios guardados')
    } catch {
      toast.error('Error guardando cambios')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-telkora-muted hover:text-telkora-text"
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Volver
        </Button>
        <h1 className="flex-1 text-xl font-bold text-telkora-text">{proyecto.nombre}</h1>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: estadoConfig.bg, color: estadoConfig.color }}
        >
          {estadoConfig.label}
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-bold"
          style={{ backgroundColor: prioridadColor + '25', color: prioridadColor }}
        >
          {proyecto.prioridad.toUpperCase()}
        </span>
        {esAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteProyecto}
            disabled={isDeleting}
            className="text-telkora-danger hover:bg-telkora-danger/10 hover:text-telkora-danger"
          >
            <Trash2 className="mr-1.5 size-4" />
            {isDeleting ? 'Eliminando…' : 'Eliminar proyecto'}
          </Button>
        )}
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* LEFT: 2/3 */}
        <div className="space-y-4 lg:col-span-2">
          {/* Informacion del proyecto */}
          <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-telkora-muted">
              Informacion del proyecto
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-[11px] text-telkora-muted">Nombre</Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text focus-visible:ring-telkora-accent"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-[11px] text-telkora-muted">Descripcion</Label>
                <Textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  placeholder="Descripcion del proyecto..."
                  className="border-telkora-border bg-telkora-card2 text-xs text-telkora-text placeholder:text-telkora-muted/50 focus-visible:ring-telkora-accent"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-telkora-muted">Tipo de proyecto</Label>
                <Select
                  value={tipoProyecto}
                  onValueChange={(v) => setTipoProyecto(v ?? tipoProyecto)}
                >
                  <SelectTrigger className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text focus:ring-telkora-accent">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="border-telkora-border bg-telkora-card">
                    {TIPOS_PROYECTO.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs text-telkora-text">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-telkora-muted">Cliente</Label>
                <Input
                  value={cliente?.empresa ?? '—'}
                  readOnly
                  className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-muted"
                />
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-[11px] text-telkora-muted">
                  <Calendar className="size-3" /> Fecha de inicio
                </Label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
                />
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-[11px] text-telkora-muted">
                  <Calendar className="size-3" /> Entrega estimada
                </Label>
                <Input
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
                />
              </div>
            </div>
          </section>

          {/* Progreso */}
          <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-telkora-muted">
              Progreso
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="flex items-center gap-1 text-[11px] text-telkora-muted">
                  <Percent className="size-3" /> Completado
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(e.target.value)}
                  className="h-8 w-24 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
                />
                <span className="text-xs font-semibold" style={{ color: estadoConfig.color }}>
                  {porcentaje}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-telkora-card2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, Number(porcentaje) || 0))}%`,
                    backgroundColor: estadoConfig.color,
                  }}
                />
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3">
            {savedState === 'saving' && (
              <span className="flex items-center gap-1.5 text-xs text-telkora-muted">
                <span className="inline-block size-3 animate-spin rounded-full border-2 border-telkora-muted border-t-transparent" />
                Guardando…
              </span>
            )}
            {savedState === 'saved' && (
              <span className="flex items-center gap-1.5 text-xs text-green-500">
                <span className="inline-block size-2 rounded-full bg-green-500" />
                Guardado
              </span>
            )}
            <Button
              onClick={handleGuardar}
              disabled={isSaving}
              className="bg-telkora-accent text-sm font-semibold text-telkora-bg hover:bg-telkora-accent2"
            >
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>

        {/* RIGHT: 1/3 */}
        <div className="space-y-4">
          {/* Pipeline */}
          <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-telkora-muted">
              Pipeline
            </h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-telkora-muted">Estado</Label>
                <Select
                  value={proyecto.estado}
                  onValueChange={(v) => handleUpdateEstado(v ?? null)}
                >
                  <SelectTrigger className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text focus:ring-telkora-accent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-telkora-border bg-telkora-card">
                    {ESTADOS_PROYECTO_ORDER.map((e) => (
                      <SelectItem key={e} value={e} className="text-xs text-telkora-text">
                        {ESTADOS_PROYECTO[e].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-[11px] text-telkora-muted">
                  <CircleDollarSign className="size-3" /> Presupuesto
                </Label>
                <p className="text-sm font-semibold text-telkora-accent">
                  {formatEUR(proyecto.presupuesto ?? 0)}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-telkora-muted">Facturado</Label>
                <p className="text-sm font-semibold text-telkora-text">
                  {formatEUR(proyecto.facturado)}
                </p>
              </div>

              {proyecto.fecha_entrega_estimada && (
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-[11px] text-telkora-muted">
                    <Calendar className="size-3" /> Proxima entrega
                  </Label>
                  <p
                    className="text-xs font-medium"
                    style={{
                      color:
                        !['entregado', 'cancelado'].includes(proyecto.estado) &&
                        new Date(proyecto.fecha_entrega_estimada) < new Date()
                          ? '#FF4444'
                          : '#888888',
                    }}
                  >
                    {formatDate(proyecto.fecha_entrega_estimada)}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-[11px] text-telkora-muted">Prioridad</Label>
                <span
                  className="inline-block rounded px-2 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: prioridadColor + '25', color: prioridadColor }}
                >
                  {PRIORIDADES_PROYECTO.find((p) => p.value === proyecto.prioridad)?.label ?? proyecto.prioridad}
                </span>
              </div>

              {esAdmin && usuarios.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-telkora-muted">Asignado a</Label>
                  <Select
                    value={proyecto.owner_id ?? ''}
                    onValueChange={(v) => handleUpdateOwner(v)}
                  >
                    <SelectTrigger className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text focus:ring-telkora-accent">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent className="border-telkora-border bg-telkora-card">
                      {usuarios.map((u) => (
                        <SelectItem key={u.userId} value={u.userId} className="text-xs text-telkora-text">
                          {u.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </section>

          {/* Transacciones vinculadas */}
          <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-telkora-muted">
                Transacciones vinculadas
              </h2>
              <button
                onClick={() => setShowCobro((v) => !v)}
                className="flex items-center gap-1 rounded-md border border-telkora-border bg-telkora-card2 px-2.5 py-1 text-[11px] text-telkora-muted hover:border-telkora-accent hover:text-telkora-accent"
              >
                + Registrar cobro
              </button>
            </div>

            {showCobro && (
              <form onSubmit={handleRegistrarCobro} className="mb-4 space-y-2 rounded-lg border border-telkora-accent/30 bg-telkora-card2 p-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-telkora-muted">Concepto</Label>
                  <Input
                    value={cobroConcepto}
                    onChange={(e) => setCobroConcepto(e.target.value)}
                    className="h-7 border-telkora-border bg-telkora-card text-xs text-telkora-text"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-telkora-muted">Importe (€)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={cobroImporte}
                      onChange={(e) => setCobroImporte(e.target.value)}
                      className="h-7 border-telkora-border bg-telkora-card text-xs text-telkora-text"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-telkora-muted">Estado</Label>
                    <Select
                      value={cobroEstado}
                      onValueChange={(v) => setCobroEstado((v ?? 'pendiente') as 'pendiente' | 'enviada' | 'cobrada')}
                    >
                      <SelectTrigger className="h-7 border-telkora-border bg-telkora-card text-xs text-telkora-text">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-telkora-border bg-telkora-card">
                        <SelectItem value="pendiente" className="text-xs text-telkora-text">Pendiente</SelectItem>
                        <SelectItem value="enviada" className="text-xs text-telkora-text">Enviada</SelectItem>
                        <SelectItem value="cobrada" className="text-xs text-telkora-text">Cobrada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-telkora-muted">Fecha cobro (opcional)</Label>
                  <Input
                    type="date"
                    value={cobroFecha}
                    onChange={(e) => setCobroFecha(e.target.value)}
                    className="h-7 border-telkora-border bg-telkora-card text-xs text-telkora-text"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCobro(false)}
                    className="rounded px-2.5 py-1 text-[11px] text-telkora-muted hover:text-telkora-text"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCobro}
                    className="rounded bg-telkora-accent px-3 py-1 text-[11px] font-semibold text-telkora-bg hover:bg-telkora-accent2 disabled:opacity-60"
                  >
                    {isSavingCobro ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </form>
            )}

            {transacciones.length === 0 ? (
              <p className="py-4 text-center text-xs text-telkora-muted">
                Sin transacciones vinculadas
              </p>
            ) : (
              <div className="space-y-2">
                {transacciones.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-telkora-border bg-telkora-card2 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-telkora-text">
                        {t.concepto}
                      </p>
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: TRANSACCION_ESTADO_COLOR[t.estado] ?? '#888888' }}
                      >
                        {t.estado}
                      </span>
                    </div>
                    <span
                      className="shrink-0 text-xs font-semibold"
                      style={{ color: t.tipo === 'ingreso' ? '#00CC6A' : '#FF4444' }}
                    >
                      {t.tipo === 'ingreso' ? '+' : '-'}{formatEUR(t.importe)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
