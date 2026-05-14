'use client'

import { useState } from 'react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TIPOS_PROYECTO, PRIORIDADES_PROYECTO } from '@/lib/constants'
import type { Proyecto, Cliente } from '@/types'
import type { Usuario } from '@/lib/profile'

interface ProyectoFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Partial<Proyecto>) => Promise<void>
  clientes: Pick<Cliente, 'id' | 'empresa'>[]
  usuarios?: Usuario[]
  currentUserId?: string
  esAdmin?: boolean
}

export function ProyectoForm({ open, onClose, onSubmit, clientes, usuarios = [], currentUserId = '', esAdmin = false }: ProyectoFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    cliente_id: '',
    tipo_proyecto: '',
    prioridad: 'media' as Proyecto['prioridad'],
    presupuesto: 0,
    fecha_inicio: '',
    fecha_entrega_estimada: '',
    descripcion: '',
    asignar_a: currentUserId,
  })

  function set(key: string, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.cliente_id) return
    setIsLoading(true)
    try {
      await onSubmit({
        nombre: form.nombre,
        cliente_id: form.cliente_id,
        tipo_proyecto: form.tipo_proyecto || null,
        prioridad: form.prioridad,
        presupuesto: form.presupuesto || null,
        fecha_inicio: form.fecha_inicio || null,
        fecha_entrega_estimada: form.fecha_entrega_estimada || null,
        descripcion: form.descripcion || null,
        owner_id: form.asignar_a || currentUserId,
        responsable_id: form.asignar_a || currentUserId,
        estado: 'briefing',
        porcentaje_completado: 0,
        facturado: 0,
      })
      onClose()
      setForm({ nombre: '', cliente_id: '', tipo_proyecto: '', prioridad: 'media', presupuesto: 0, fecha_inicio: '', fecha_entrega_estimada: '', descripcion: '', asignar_a: currentUserId })
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="border-telkora-border bg-telkora-card text-telkora-text sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-telkora-text">Nuevo proyecto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-telkora-muted">Nombre *</Label>
            <Input
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              required
              className="border-telkora-border bg-telkora-card2 text-telkora-text"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-telkora-muted">Cliente *</Label>
            <Select value={form.cliente_id} onValueChange={(v) => set('cliente_id', v ?? '')}>
              <SelectTrigger className="border-telkora-border bg-telkora-card2 text-telkora-text">
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent className="border-telkora-border bg-telkora-card">
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-telkora-text">{c.empresa}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Tipo</Label>
              <Select value={form.tipo_proyecto} onValueChange={(v) => set('tipo_proyecto', v ?? '')}>
                <SelectTrigger className="border-telkora-border bg-telkora-card2 text-telkora-text">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="border-telkora-border bg-telkora-card">
                  {TIPOS_PROYECTO.map((t) => (
                    <SelectItem key={t} value={t} className="text-telkora-text">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Prioridad</Label>
              <Select value={form.prioridad} onValueChange={(v) => set('prioridad', v ?? 'media')}>
                <SelectTrigger className="border-telkora-border bg-telkora-card2 text-telkora-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-telkora-border bg-telkora-card">
                  {PRIORIDADES_PROYECTO.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-telkora-text">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Presupuesto (EUR)</Label>
              <Input
                type="number"
                min={0}
                value={form.presupuesto}
                onChange={(e) => set('presupuesto', Number(e.target.value))}
                className="border-telkora-border bg-telkora-card2 text-telkora-text"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Fecha inicio</Label>
              <Input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => set('fecha_inicio', e.target.value)}
                className="border-telkora-border bg-telkora-card2 text-telkora-text"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-telkora-muted">Fecha entrega estimada</Label>
            <Input
              type="date"
              value={form.fecha_entrega_estimada}
              onChange={(e) => set('fecha_entrega_estimada', e.target.value)}
              className="border-telkora-border bg-telkora-card2 text-telkora-text"
            />
          </div>

          {esAdmin && usuarios.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Asignar a</Label>
              <Select value={form.asignar_a} onValueChange={(v) => set('asignar_a', v ?? currentUserId)}>
                <SelectTrigger className="border-telkora-border bg-telkora-card2 text-telkora-text">
                  <SelectValue placeholder="Seleccionar responsable" />
                </SelectTrigger>
                <SelectContent className="border-telkora-border bg-telkora-card">
                  {usuarios.map((u) => (
                    <SelectItem key={u.userId} value={u.userId} className="text-telkora-text">{u.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs text-telkora-muted">Descripción</Label>
            <Textarea
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              rows={2}
              className="border-telkora-border bg-telkora-card2 text-telkora-text"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-telkora-border text-telkora-muted hover:bg-telkora-card2">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !form.nombre.trim() || !form.cliente_id} className="bg-telkora-accent text-telkora-bg hover:bg-telkora-accent2">
              {isLoading ? 'Guardando…' : 'Crear proyecto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
