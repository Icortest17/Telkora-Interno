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
import { CATEGORIAS_TRANSACCION } from '@/lib/constants'
import type { Transaccion, Cliente } from '@/types'
import type { Usuario } from '@/lib/profile'

interface TransaccionFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Partial<Transaccion>) => Promise<void>
  clientes: Pick<Cliente, 'id' | 'empresa'>[]
  usuarios?: Usuario[]
  currentUserId?: string
  esAdmin?: boolean
  initialData?: Partial<Transaccion>
}

export function TransaccionForm({ open, onClose, onSubmit, clientes, usuarios = [], currentUserId = '', esAdmin = false, initialData }: TransaccionFormProps) {
  const isEditMode = Boolean(initialData?.id)
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    tipo: (initialData?.tipo ?? 'ingreso') as Transaccion['tipo'],
    concepto: initialData?.concepto ?? '',
    importe: initialData?.importe ?? 0,
    cliente_id: initialData?.cliente_id ?? '',
    categoria: initialData?.categoria ?? '',
    es_recurrente: initialData?.es_recurrente ?? false,
    fecha_cobro: initialData?.fecha_cobro ?? '',
    estado: (initialData?.estado ?? 'pendiente') as Transaccion['estado'],
    notas: initialData?.notas ?? '',
    asignar_a: initialData?.owner_id ?? currentUserId,
  })

  function set(key: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.concepto.trim() || form.importe <= 0) return
    setIsLoading(true)
    try {
      const payload: Partial<Transaccion> = {
        tipo: form.tipo,
        concepto: form.concepto,
        importe: form.importe,
        estado: form.estado,
        es_recurrente: form.es_recurrente,
        cliente_id: form.cliente_id || null,
        categoria: form.categoria || null,
        fecha_cobro: form.fecha_cobro || null,
        notas: form.notas || null,
        owner_id: form.asignar_a || currentUserId,
      }
      if (isEditMode) {
        payload.id = initialData!.id
      }
      await onSubmit(payload)
      onClose()
      setForm({ tipo: 'ingreso', concepto: '', importe: 0, cliente_id: '', categoria: '', es_recurrente: false, fecha_cobro: '', estado: 'pendiente', notas: '', asignar_a: currentUserId })
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="border-telkora-border bg-telkora-card text-telkora-text sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-telkora-text">{isEditMode ? 'Editar transacción' : 'Nueva transacción'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => set('tipo', v ?? 'ingreso')}>
                <SelectTrigger className="border-telkora-border bg-telkora-card2 text-telkora-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-telkora-border bg-telkora-card">
                  <SelectItem value="ingreso" className="text-telkora-accent">Ingreso</SelectItem>
                  <SelectItem value="gasto" className="text-telkora-danger">Gasto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Importe (EUR) *</Label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={form.importe}
                onChange={(e) => set('importe', Number(e.target.value))}
                required
                className="border-telkora-border bg-telkora-card2 text-telkora-text"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-telkora-muted">Concepto *</Label>
            <Input
              value={form.concepto}
              onChange={(e) => set('concepto', e.target.value)}
              required
              className="border-telkora-border bg-telkora-card2 text-telkora-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Categoría</Label>
              <Select value={form.categoria} onValueChange={(v) => set('categoria', v ?? '')}>
                <SelectTrigger className="border-telkora-border bg-telkora-card2 text-telkora-text">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="border-telkora-border bg-telkora-card">
                  {CATEGORIAS_TRANSACCION.map((c) => (
                    <SelectItem key={c} value={c} className="text-telkora-text">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set('estado', v ?? 'pendiente')}>
                <SelectTrigger className="border-telkora-border bg-telkora-card2 text-telkora-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-telkora-border bg-telkora-card">
                  <SelectItem value="pendiente" className="text-telkora-text">Pendiente</SelectItem>
                  <SelectItem value="enviada" className="text-telkora-text">Enviada</SelectItem>
                  <SelectItem value="cobrada" className="text-telkora-text">Cobrada</SelectItem>
                  <SelectItem value="vencida" className="text-telkora-text">Vencida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Cliente</Label>
              <Select value={form.cliente_id} onValueChange={(v) => set('cliente_id', v ?? '')}>
                <SelectTrigger className="border-telkora-border bg-telkora-card2 text-telkora-text">
                  <SelectValue placeholder="Ninguno" />
                </SelectTrigger>
                <SelectContent className="border-telkora-border bg-telkora-card">
                  <SelectItem value="" className="text-telkora-muted">Ninguno</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-telkora-text">{c.empresa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Fecha cobro</Label>
              <Input
                type="date"
                value={form.fecha_cobro}
                onChange={(e) => set('fecha_cobro', e.target.value)}
                className="border-telkora-border bg-telkora-card2 text-telkora-text"
              />
            </div>
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurrente"
              checked={form.es_recurrente}
              onChange={(e) => set('es_recurrente', e.target.checked)}
              className="accent-telkora-accent"
            />
            <label htmlFor="recurrente" className="text-xs text-telkora-muted cursor-pointer">
              Transacción recurrente (mensual)
            </label>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-telkora-muted">Notas</Label>
            <Textarea
              value={form.notas}
              onChange={(e) => set('notas', e.target.value)}
              rows={2}
              className="border-telkora-border bg-telkora-card2 text-telkora-text"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-telkora-border text-telkora-muted hover:bg-telkora-card2">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !form.concepto.trim() || form.importe <= 0}
              className="bg-telkora-accent text-telkora-bg hover:bg-telkora-accent2"
            >
              {isLoading ? 'Guardando…' : isEditMode ? 'Guardar cambios' : 'Crear transacción'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
