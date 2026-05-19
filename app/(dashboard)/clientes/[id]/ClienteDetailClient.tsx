'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, ExternalLink, Trash2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatEUR, mesesComoCliente, formatDate } from '@/lib/utils'
import { TIPOS_PROYECTO } from '@/lib/constants'
import type { Cliente, Proyecto } from '@/types'

const TIER_CONFIG = {
  gold:   { label: 'Gold',   color: '#FFD700' },
  silver: { label: 'Silver', color: '#C0C0C0' },
  bronze: { label: 'Bronze', color: '#CD7F32' },
}

interface Props {
  initialCliente: Cliente
  proyectos: Partial<Proyecto>[]
  esAdmin: boolean
  currentUserId: string
}

export function ClienteDetailClient({ initialCliente, proyectos, esAdmin, currentUserId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [cliente, setCliente] = useState<Cliente>(initialCliente)
  const [isDeleting, setIsDeleting] = useState(false)

  // Nuevo proyecto modal
  const [showNuevoProyecto, setShowNuevoProyecto] = useState(false)
  const [npNombre, setNpNombre] = useState('')
  const [npTipo, setNpTipo] = useState(TIPOS_PROYECTO[0])
  const [npFecha, setNpFecha] = useState('')
  const [npPresupuesto, setNpPresupuesto] = useState('')
  const [npPrioridad, setNpPrioridad] = useState<'alta' | 'media' | 'baja'>('media')
  const [isCreandoProyecto, setIsCreandoProyecto] = useState(false)

  async function handleCrearProyecto(e: React.FormEvent) {
    e.preventDefault()
    if (!npNombre.trim()) return
    setIsCreandoProyecto(true)
    try {
      const { data: nuevo, error } = await supabase
        .from('proyectos')
        .insert({
          nombre: npNombre.trim(),
          cliente_id: cliente.id,
          tipo_proyecto: npTipo,
          fecha_entrega_estimada: npFecha || null,
          presupuesto: Number(npPresupuesto) || null,
          prioridad: npPrioridad,
          estado: 'briefing',
          owner_id: currentUserId,
          porcentaje_completado: 0,
          facturado: 0,
        })
        .select()
        .single()
      if (error) throw error
      toast.success('Proyecto creado')
      router.push(`/proyectos/${nuevo.id}`)
    } catch {
      toast.error('Error creando proyecto')
      setIsCreandoProyecto(false)
    }
  }

  const updateField = useCallback(
    async (field: keyof Cliente, value: unknown) => {
      setCliente((prev) => ({ ...prev, [field]: value }))
      try {
        const { error } = await supabase
          .from('clientes')
          .update({ [field]: value })
          .eq('id', cliente.id)
        if (error) throw error
      } catch {
        toast.error('Error guardando')
      }
    },
    [cliente.id, supabase]
  )

  async function handleDeleteCliente() {
    if (!window.confirm('¿Eliminar este cliente? Se desvinculan sus proyectos y transacciones.')) return
    setIsDeleting(true)
    try {
      // Desvincula proyectos y transacciones referenciados a este cliente (FK NO ACTION)
      await Promise.all([
        supabase.from('proyectos').update({ cliente_id: null }).eq('cliente_id', cliente.id),
        supabase.from('transacciones').update({ cliente_id: null }).eq('cliente_id', cliente.id),
      ])
      const { error } = await supabase.from('clientes').delete().eq('id', cliente.id)
      if (error) throw error
      toast.success('Cliente eliminado')
      router.push('/clientes')
    } catch (err) {
      console.error('[eliminar cliente]', err)
      toast.error('Error eliminando cliente')
      setIsDeleting(false)
    }
  }

  const tier = TIER_CONFIG[cliente.tier ?? 'bronze'] ?? TIER_CONFIG.bronze
  const meses = mesesComoCliente(cliente.fecha_inicio_relacion)

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/clientes')}
          className="text-telkora-muted hover:text-telkora-text"
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Volver
        </Button>
        <h1 className="flex-1 text-xl font-bold text-telkora-text">{cliente.empresa}</h1>
        <span
          className="rounded px-2 py-0.5 text-xs font-bold"
          style={{ color: tier.color, border: `1px solid ${tier.color}33` }}
        >
          {tier.label}
        </span>
        {cliente.lead_origen_id && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/leads/${cliente.lead_origen_id}`)}
            className="h-8 border-telkora-border text-xs text-telkora-muted hover:bg-telkora-card2"
          >
            <ExternalLink className="mr-1.5 size-3" />
            Ver lead de origen
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNuevoProyecto(true)}
          className="h-8 border-telkora-border text-xs text-telkora-muted hover:bg-telkora-card2"
        >
          <Plus className="mr-1.5 size-3" />
          Nuevo proyecto
        </Button>
        {esAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteCliente}
            disabled={isDeleting}
            className="text-telkora-danger hover:bg-telkora-danger/10 hover:text-telkora-danger"
          >
            <Trash2 className="mr-1.5 size-4" />
            {isDeleting ? 'Eliminando…' : 'Eliminar cliente'}
          </Button>
        )}
      </div>

      {/* Modal: Nuevo proyecto */}
      {showNuevoProyecto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-telkora-border bg-telkora-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-telkora-text">Nuevo proyecto</h2>
              <button
                onClick={() => setShowNuevoProyecto(false)}
                className="text-telkora-muted hover:text-telkora-text"
              >
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleCrearProyecto} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-telkora-muted">Nombre *</Label>
                <Input
                  required
                  value={npNombre}
                  onChange={(e) => setNpNombre(e.target.value)}
                  placeholder="Nombre del proyecto"
                  className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-telkora-muted">Tipo de proyecto</Label>
                <Select value={npTipo} onValueChange={(v) => setNpTipo(v ?? npTipo)}>
                  <SelectTrigger className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-telkora-border bg-telkora-card">
                    {TIPOS_PROYECTO.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs text-telkora-text">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-telkora-muted">Entrega estimada</Label>
                  <Input
                    type="date"
                    value={npFecha}
                    onChange={(e) => setNpFecha(e.target.value)}
                    className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-telkora-muted">Presupuesto (€)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={npPresupuesto}
                    onChange={(e) => setNpPresupuesto(e.target.value)}
                    placeholder="0"
                    className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-telkora-muted">Prioridad</Label>
                <Select
                  value={npPrioridad}
                  onValueChange={(v) => setNpPrioridad((v ?? 'media') as 'alta' | 'media' | 'baja')}
                >
                  <SelectTrigger className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-telkora-border bg-telkora-card">
                    <SelectItem value="alta" className="text-xs text-telkora-text">Alta</SelectItem>
                    <SelectItem value="media" className="text-xs text-telkora-text">Media</SelectItem>
                    <SelectItem value="baja" className="text-xs text-telkora-text">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNuevoProyecto(false)}
                  className="h-8 border-telkora-border text-xs text-telkora-muted hover:bg-telkora-card2"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreandoProyecto}
                  className="h-8 bg-telkora-accent text-xs font-semibold text-telkora-bg hover:bg-telkora-accent2"
                >
                  {isCreandoProyecto ? 'Creando…' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'MRR', value: formatEUR(cliente.mrr), accent: true },
            { label: 'Valor total contrato', value: formatEUR(cliente.valor_total_contrato) },
            { label: 'Meses como cliente', value: `${meses} meses` },
            { label: 'NPS', value: cliente.nps !== null ? `${cliente.nps}/10` : '—' },
          ].map(({ label, value, accent }) => (
            <div key={label} className="rounded-xl border border-telkora-border bg-telkora-card p-4">
              <p className="text-xs text-telkora-muted">{label}</p>
              <p className={`mt-1 text-xl font-bold ${accent ? 'text-telkora-accent' : 'text-telkora-text'}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Datos editable */}
        <section className="rounded-xl border border-telkora-border bg-telkora-card p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-telkora-muted">Datos</h2>
          <div className="grid grid-cols-2 gap-3">
            {(['empresa', 'contacto', 'email', 'telefono'] as const).map((f) => (
              <div key={f} className="space-y-1">
                <Label className="text-[11px] capitalize text-telkora-muted">{f}</Label>
                <Input
                  value={(cliente[f] as string) ?? ''}
                  onChange={(e) => updateField(f, e.target.value)}
                  className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-[11px] text-telkora-muted">Estado</Label>
              <Select value={cliente.estado} onValueChange={(v) => updateField('estado', v)}>
                <SelectTrigger className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-telkora-border bg-telkora-card">
                  {['activo', 'pausado', 'churned', 'upsell'].map((e) => (
                    <SelectItem key={e} value={e} className="text-xs text-telkora-text capitalize">{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-telkora-muted">MRR (€/mes)</Label>
              <Input
                type="number"
                value={cliente.mrr}
                onChange={(e) => updateField('mrr', Number(e.target.value))}
                className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-telkora-muted">Inicio relación</Label>
              <Input
                type="date"
                value={cliente.fecha_inicio_relacion ?? ''}
                onChange={(e) => updateField('fecha_inicio_relacion', e.target.value || null)}
                className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-telkora-muted">NPS (0-10)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={cliente.nps ?? ''}
                onChange={(e) => updateField('nps', e.target.value ? Number(e.target.value) : null)}
                className="h-8 border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
              />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <Label className="text-[11px] text-telkora-muted">Notas</Label>
            <Textarea
              value={cliente.notas ?? ''}
              onChange={(e) => updateField('notas', e.target.value)}
              rows={3}
              className="border-telkora-border bg-telkora-card2 text-xs text-telkora-text"
            />
          </div>
        </section>

        {/* Proyectos relacionados */}
        <section className="col-span-full rounded-xl border border-telkora-border bg-telkora-card p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-telkora-muted">
            Proyectos relacionados
          </h2>
          {proyectos.length === 0 ? (
            <p className="text-xs text-telkora-muted">Sin proyectos asociados (disponible en Fase 2)</p>
          ) : (
            <div className="space-y-2">
              {proyectos.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border border-telkora-border bg-telkora-card2 p-3">
                  <div className="flex-1">
                    <p className="text-sm text-telkora-text">{p.nombre}</p>
                    <p className="text-xs text-telkora-muted">{p.estado} · {p.porcentaje_completado}%</p>
                  </div>
                  {p.fecha_entrega_estimada && (
                    <p className="text-xs text-telkora-muted">{formatDate(p.fecha_entrega_estimada)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
