'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Phone, Mail, Globe, User, Calendar, FileText, MessageSquare, PhoneCall, Video, ArrowRightLeft, Send, Trash2, Link2, Plus, X } from 'lucide-react'
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
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityScore } from '@/components/shared/PriorityScore'
import { SECTORES, FUENTES, PACKS_SERVICIOS, FASES_PROCESO, ESTADOS_LEAD_ORDER, TIPOS_ACTIVIDAD } from '@/lib/constants'
import { formatDateTime, formatEUR, formatDate } from '@/lib/utils'
import type { Lead, LeadActividad, EstadoLead, TipoActividad } from '@/types'
import type { Usuario } from '@/lib/profile'

const ACTIVIDAD_ICONS: Record<TipoActividad, React.ElementType> = {
  nota: FileText,
  llamada: PhoneCall,
  email: Mail,
  whatsapp: MessageSquare,
  reunion: Video,
  cambio_estado: ArrowRightLeft,
  propuesta: Send,
}

interface Props {
  initialLead: Lead
  initialActividades: LeadActividad[]
  currentUserId: string
  esAdmin: boolean
  usuarios: Usuario[]
}

function EtiquetaInput({ onAdd }: { onAdd: (tag: string) => void }) {
  const [val, setVal] = useState('')
  return (
    <div className="flex gap-1.5">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (val.trim()) { onAdd(val.trim()); setVal('') } } }}
        placeholder="Nueva etiqueta…"
        className="h-7 flex-1 rounded border border-telkora-border bg-telkora-card2 px-2 text-xs text-telkora-text placeholder:text-telkora-muted focus:outline-none focus:ring-1 focus:ring-telkora-accent"
      />
      <button
        onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal('') } }}
        className="h-7 rounded bg-telkora-card2 px-2.5 text-xs text-telkora-muted hover:bg-telkora-border hover:text-telkora-text"
      >
        + Añadir
      </button>
    </div>
  )
}

export function LeadDetailClient({ initialLead, initialActividades, currentUserId, esAdmin, usuarios }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [lead, setLead] = useState<Lead>(initialLead)
  const [actividades, setActividades] = useState<LeadActividad[]>(initialActividades)
  const [notasLocal, setNotasLocal] = useState(lead.notas ?? '')
  const [tipoActividad, setTipoActividad] = useState<TipoActividad>('nota')
  const [contenidoActividad, setContenidoActividad] = useState('')
  const [isSavingActividad, setIsSavingActividad] = useState(false)
  const [isConvirtiendo, setIsConvirtiendo] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Adjuntos
  const [adjuntos, setAdjuntos] = useState<{ nombre: string; url: string }[]>(initialLead.adjuntos ?? [])
  const [nuevoAdjuntoNombre, setNuevoAdjuntoNombre] = useState('')
  const [nuevoAdjuntoUrl, setNuevoAdjuntoUrl] = useState('')
  const [isSavingAdjunto, setIsSavingAdjunto] = useState(false)

  // Debounce notas
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (notasLocal !== lead.notas) {
      debounceRef.current = setTimeout(async () => {
        const { error } = await supabase
          .from('leads')
          .update({ notas: notasLocal })
          .eq('id', lead.id)
        if (!error) setLead((prev) => ({ ...prev, notas: notasLocal }))
      }, 1000)
    }
    return () => clearTimeout(debounceRef.current)
  }, [notasLocal, lead.id, lead.notas, supabase])

  const updateField = useCallback(
    async (field: keyof Lead, value: unknown) => {
      setLead((prev) => ({ ...prev, [field]: value }))
      try {
        const { error } = await supabase
          .from('leads')
          .update({ [field]: value })
          .eq('id', lead.id)
        if (error) throw error
        // Auto-recalculate valor_ponderado locally (mirrors DB trigger)
        if (field === 'valor_estimado' || field === 'probabilidad') {
          const newValorEstimado = field === 'valor_estimado' ? (value as number) : lead.valor_estimado
          const newProbabilidad = field === 'probabilidad' ? (value as number) : lead.probabilidad
          const newPonderado = Math.round(newValorEstimado * newProbabilidad / 100)
          setLead((prev) => ({ ...prev, valor_ponderado: newPonderado }))
        }
      } catch {
        toast.error('Error guardando')
      }
    },
    [lead.id, lead.valor_estimado, lead.probabilidad, supabase]
  )

  const handleEstadoChange = useCallback(
    async (nuevoEstado: EstadoLead) => {
      const estadoAnterior = lead.estado
      setLead((prev) => ({ ...prev, estado: nuevoEstado }))
      try {
        await supabase.from('leads').update({ estado: nuevoEstado }).eq('id', lead.id)
        const { data: act } = await supabase
          .from('lead_actividades')
          .insert({
            lead_id: lead.id,
            usuario_id: currentUserId,
            tipo: 'cambio_estado',
            contenido: `Estado cambiado de "${estadoAnterior}" a "${nuevoEstado}"`,
            estado_anterior: estadoAnterior,
            estado_nuevo: nuevoEstado,
          })
          .select()
          .single()
        if (act) setActividades((prev) => [act, ...prev])
      } catch {
        setLead((prev) => ({ ...prev, estado: estadoAnterior }))
        toast.error('Error cambiando estado')
      }
    },
    [lead.id, lead.estado, currentUserId, supabase]
  )

  async function handleGuardarActividad() {
    if (!contenidoActividad.trim()) return
    setIsSavingActividad(true)
    try {
      const { data, error } = await supabase
        .from('lead_actividades')
        .insert({
          lead_id: lead.id,
          usuario_id: currentUserId,
          tipo: tipoActividad,
          contenido: contenidoActividad,
          estado_anterior: null,
          estado_nuevo: null,
        })
        .select()
        .single()
      if (error) throw error
      setActividades((prev) => [data, ...prev])
      setContenidoActividad('')
      toast.success('Actividad registrada')
    } catch {
      toast.error('Error registrando actividad')
    } finally {
      setIsSavingActividad(false)
    }
  }

  async function handleDeleteLead() {
    if (!window.confirm('¿Eliminar este lead? Esta acción no se puede deshacer.')) return
    setIsDeleting(true)
    try {
      // Desvincula cualquier cliente que tenga este lead como origen (FK NO ACTION)
      await supabase.from('clientes').update({ lead_origen_id: null }).eq('lead_origen_id', lead.id)
      // lead_actividades se borra automáticamente (CASCADE)
      const { error } = await supabase.from('leads').delete().eq('id', lead.id)
      if (error) throw error
      toast.success('Lead eliminado')
      router.push('/leads')
    } catch {
      toast.error('Error eliminando lead')
      setIsDeleting(false)
    }
  }

  async function handleConvertirCliente() {
    setIsConvirtiendo(true)
    try {
      const { data: cliente, error } = await supabase
        .from('clientes')
        .insert({
          lead_origen_id: lead.id,
          empresa: lead.empresa,
          contacto: lead.contacto,
          email: lead.email,
          telefono: lead.telefono,
          website: lead.website,
          sector: lead.sector,
          pais: lead.pais,
          estado: 'activo',
          mrr: 0,
        })
        .select()
        .single()
      if (error) throw error
      toast.success('Lead convertido a cliente')
      router.push(`/clientes/${cliente.id}`)
    } catch {
      toast.error('Error convirtiendo a cliente')
    } finally {
      setIsConvirtiendo(false)
    }
  }

  async function handleAnadirAdjunto() {
    if (!nuevoAdjuntoUrl.trim()) return
    const nombre = nuevoAdjuntoNombre.trim() || nuevoAdjuntoUrl
    const nuevosAdjuntos = [...adjuntos, { nombre, url: nuevoAdjuntoUrl.trim() }]
    setIsSavingAdjunto(true)
    try {
      const { error } = await supabase
        .from('leads')
        .update({ adjuntos: nuevosAdjuntos })
        .eq('id', lead.id)
      if (error) throw error
      setAdjuntos(nuevosAdjuntos)
      setNuevoAdjuntoNombre('')
      setNuevoAdjuntoUrl('')
      toast.success('Adjunto añadido')
    } catch {
      toast.error('Error añadiendo adjunto')
    } finally {
      setIsSavingAdjunto(false)
    }
  }

  async function handleEliminarAdjunto(index: number) {
    const nuevosAdjuntos = adjuntos.filter((_, i) => i !== index)
    try {
      const { error } = await supabase
        .from('leads')
        .update({ adjuntos: nuevosAdjuntos })
        .eq('id', lead.id)
      if (error) throw error
      setAdjuntos(nuevosAdjuntos)
      toast.success('Adjunto eliminado')
    } catch {
      toast.error('Error eliminando adjunto')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/leads')}
          className="text-telkora-muted hover:text-telkora-text"
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Volver
        </Button>
        <div className="flex flex-1 items-center gap-3">
          <h1 className="text-xl font-bold text-telkora-text">{lead.empresa}</h1>
          <StatusBadge estado={lead.estado} />
          <PriorityScore score={lead.prioridad_score} />
        </div>
        {lead.estado === 'cerrado_ganado' && (
          <Button
            onClick={handleConvertirCliente}
            disabled={isConvirtiendo}
            className="bg-telkora-accent text-telkora-bg hover:bg-telkora-accent2"
          >
            {isConvirtiendo ? 'Convirtiendo…' : 'Convertir a cliente'}
          </Button>
        )}
        {(esAdmin || lead.owner_id === currentUserId) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteLead}
            disabled={isDeleting}
            className="text-telkora-danger hover:bg-telkora-danger/10 hover:text-telkora-danger"
          >
            <Trash2 className="mr-1.5 size-4" />
            {isDeleting ? 'Eliminando…' : 'Eliminar lead'}
          </Button>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT: Data */}
        <div className="space-y-4">
          {/* Contacto */}
          <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-telkora-muted">
              Información de contacto
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Empresa', field: 'empresa' as keyof Lead, icon: User },
                { label: 'Contacto', field: 'contacto' as keyof Lead, icon: User },
                { label: 'Email', field: 'email' as keyof Lead, icon: Mail },
                { label: 'Teléfono', field: 'telefono' as keyof Lead, icon: Phone },
                { label: 'Website', field: 'website' as keyof Lead, icon: Globe },
              ].map(({ label, field, icon: Icon }) => (
                <div key={field} className="space-y-1">
                  <Label className="flex items-center gap-1 text-[11px] text-telkora-muted">
                    <Icon className="size-3" />{label}
                  </Label>
                  <Input
                    value={(lead[field] as string) ?? ''}
                    onChange={(e) => updateField(field, e.target.value)}
                    className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text focus-visible:ring-telkora-accent"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-[11px] text-telkora-muted">Sector</Label>
                <Select value={lead.sector ?? ''} onValueChange={(v) => updateField('sector', v)}>
                  <SelectTrigger className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text focus:ring-telkora-accent">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="border-telkora-border bg-telkora-card">
                    {SECTORES.map((s) => <SelectItem key={s} value={s} className="text-xs text-telkora-text">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Pipeline */}
          <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-telkora-muted">Pipeline</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-[11px] text-telkora-muted">Estado</Label>
                <Select value={lead.estado} onValueChange={(v) => handleEstadoChange(v as EstadoLead)}>
                  <SelectTrigger className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text focus:ring-telkora-accent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-telkora-border bg-telkora-card">
                    {ESTADOS_LEAD_ORDER.map((e) => (
                      <SelectItem key={e} value={e} className="text-xs text-telkora-text">{e.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-telkora-muted">Valor estimado (€)</Label>
                <Input
                  type="number"
                  value={lead.valor_estimado}
                  onChange={(e) => updateField('valor_estimado', Number(e.target.value))}
                  className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-telkora-muted">Probabilidad (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={lead.probabilidad}
                  onChange={(e) => updateField('probabilidad', Number(e.target.value))}
                  className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-telkora-muted">Valor ponderado</Label>
                <Input
                  value={formatEUR(lead.valor_ponderado)}
                  readOnly
                  className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-accent"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-telkora-muted">Pack de interés</Label>
                <Select value={lead.pack_interes ?? ''} onValueChange={(v) => updateField('pack_interes', v)}>
                  <SelectTrigger className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="border-telkora-border bg-telkora-card">
                    {PACKS_SERVICIOS.map((p) => (
                      <SelectItem key={p} value={p} className="text-xs text-telkora-text">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-telkora-muted">Fuente</Label>
                <Select value={lead.fuente ?? ''} onValueChange={(v) => updateField('fuente', v)}>
                  <SelectTrigger className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="border-telkora-border bg-telkora-card">
                    {FUENTES.map((f) => (
                      <SelectItem key={f} value={f} className="text-xs text-telkora-text">{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-[11px] text-telkora-muted">Fase del proceso</Label>
                <Select value={lead.fase_proceso} onValueChange={(v) => updateField('fase_proceso', v)}>
                  <SelectTrigger className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-telkora-border bg-telkora-card">
                    {FASES_PROCESO.map((f) => (
                      <SelectItem key={f.value} value={f.value} className="text-xs text-telkora-text">{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {esAdmin && usuarios.length > 0 && (
                <div className="col-span-2 space-y-1">
                  <Label className="text-[11px] text-telkora-muted">Asignado a</Label>
                  <Select
                    value={lead.owner_id ?? ''}
                    onValueChange={(v) => updateField('owner_id', v)}
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

          {/* Seguimiento */}
          <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-telkora-muted">Seguimiento</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-[11px] text-telkora-muted">
                  <Calendar className="size-3" /> Primer contacto
                </Label>
                <Input
                  type="date"
                  value={lead.fecha_primer_contacto ?? ''}
                  onChange={(e) => updateField('fecha_primer_contacto', e.target.value || null)}
                  className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
                />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-[11px] text-telkora-muted">
                  <Calendar className="size-3" /> Próximo follow-up
                </Label>
                <Input
                  type="date"
                  value={lead.proximo_followup ?? ''}
                  onChange={(e) => updateField('proximo_followup', e.target.value || null)}
                  className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
                />
              </div>
            </div>
          </section>

          {/* Notas */}
          <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-telkora-muted">Notas</h2>
            <Textarea
              value={notasLocal}
              onChange={(e) => setNotasLocal(e.target.value)}
              rows={4}
              placeholder="Escribe notas sobre este lead…"
              className="border-telkora-border bg-telkora-card2 text-sm text-telkora-text placeholder:text-telkora-muted/50 focus-visible:ring-telkora-accent"
            />
            <p className="mt-1.5 text-[10px] text-telkora-muted">Guardado automáticamente</p>
          </section>

          {/* Adjuntos */}
          <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-telkora-muted">Adjuntos</h2>

            {/* Añadir enlace */}
            <div className="mb-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={nuevoAdjuntoNombre}
                  onChange={(e) => setNuevoAdjuntoNombre(e.target.value)}
                  placeholder="Nombre del archivo"
                  className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
                />
                <Input
                  value={nuevoAdjuntoUrl}
                  onChange={(e) => setNuevoAdjuntoUrl(e.target.value)}
                  placeholder="URL (Google Drive, Dropbox…)"
                  className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAnadirAdjunto() }}
                />
              </div>
              <Button
                size="sm"
                onClick={handleAnadirAdjunto}
                disabled={isSavingAdjunto || !nuevoAdjuntoUrl.trim()}
                className="h-8 bg-telkora-accent text-xs text-telkora-bg hover:bg-telkora-accent2"
              >
                <Plus className="mr-1.5 size-3.5" />
                {isSavingAdjunto ? 'Añadiendo…' : 'Añadir enlace'}
              </Button>
            </div>

            {/* Lista de adjuntos */}
            {adjuntos.length === 0 ? (
              <p className="py-3 text-center text-xs text-telkora-muted">Sin adjuntos</p>
            ) : (
              <ul className="space-y-1.5">
                {adjuntos.map((adj, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-telkora-border bg-telkora-card2 px-3 py-2"
                  >
                    <Link2 className="size-3.5 flex-shrink-0 text-telkora-muted" />
                    <a
                      href={adj.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate text-xs text-telkora-accent hover:underline"
                    >
                      {adj.nombre}
                    </a>
                    <button
                      onClick={() => handleEliminarAdjunto(i)}
                      className="flex-shrink-0 text-telkora-muted hover:text-telkora-danger transition-colors"
                      title="Eliminar adjunto"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Etiquetas */}
          <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-telkora-muted">Etiquetas</h2>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(lead.etiquetas ?? []).map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-telkora-card2 px-2.5 py-0.5 text-xs text-telkora-text">
                  {tag}
                  <button
                    onClick={() => updateField('etiquetas', (lead.etiquetas ?? []).filter((t) => t !== tag))}
                    className="text-telkora-muted hover:text-telkora-danger"
                  >×</button>
                </span>
              ))}
              {(lead.etiquetas ?? []).length === 0 && (
                <span className="text-xs text-telkora-muted">Sin etiquetas</span>
              )}
            </div>
            <EtiquetaInput onAdd={(tag) => {
              const current = lead.etiquetas ?? []
              if (!current.includes(tag)) updateField('etiquetas', [...current, tag])
            }} />
          </section>
        </div>

        {/* RIGHT: Timeline */}
        <div className="flex flex-col space-y-4">
          <section className="flex flex-1 flex-col rounded-xl border border-telkora-border bg-telkora-card p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-telkora-muted">
              Historial de actividad
            </h2>

            {/* Nueva actividad */}
            <div className="mb-4 space-y-2 rounded-lg border border-telkora-border bg-telkora-card2 p-3">
              <div className="flex gap-2">
                <Select value={tipoActividad} onValueChange={(v) => setTipoActividad(v as TipoActividad)}>
                  <SelectTrigger className="h-8 w-36 border-telkora-border bg-telkora-card text-xs text-telkora-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-telkora-border bg-telkora-card">
                    {TIPOS_ACTIVIDAD.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs text-telkora-text">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleGuardarActividad}
                  disabled={isSavingActividad || !contenidoActividad.trim()}
                  className="ml-auto h-8 bg-telkora-accent text-xs text-telkora-bg hover:bg-telkora-accent2"
                >
                  {isSavingActividad ? 'Guardando…' : 'Registrar'}
                </Button>
              </div>
              <Textarea
                value={contenidoActividad}
                onChange={(e) => setContenidoActividad(e.target.value)}
                placeholder="Describe la actividad…"
                rows={2}
                className="border-telkora-border bg-telkora-card text-xs text-telkora-text placeholder:text-telkora-muted/50 focus-visible:ring-telkora-accent"
              />
            </div>

            {/* Timeline list */}
            <div className="flex-1 space-y-3 overflow-y-auto">
              {actividades.length === 0 ? (
                <p className="py-8 text-center text-xs text-telkora-muted">Sin actividad registrada</p>
              ) : (
                actividades.map((act) => {
                  const Icon = ACTIVIDAD_ICONS[act.tipo]
                  return (
                    <div key={act.id} className="flex gap-3">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-telkora-border bg-telkora-card2">
                        <Icon className="size-3.5 text-telkora-muted" />
                      </div>
                      <div className="flex-1 rounded-lg border border-telkora-border bg-telkora-card2 p-3">
                        <p className="text-xs text-telkora-text">{act.contenido}</p>
                        <p className="mt-1 text-[10px] text-telkora-muted">
                          {formatDateTime(act.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
