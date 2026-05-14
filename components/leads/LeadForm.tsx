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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SECTORES, FUENTES, PACKS_SERVICIOS } from '@/lib/constants'
import type { Lead } from '@/types'
import type { Usuario } from '@/lib/profile'

interface LeadFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Partial<Lead>) => Promise<void>
  usuarios?: Usuario[]
  currentUserId?: string
  esAdmin?: boolean
}

export function LeadForm({ open, onClose, onSubmit, usuarios = [], currentUserId = '', esAdmin = false }: LeadFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    empresa: '',
    contacto: '',
    email: '',
    telefono: '',
    website: '',
    sector: '',
    pack_interes: '',
    fuente: '',
    valor_estimado: 0,
    notas: '',
    asignar_a: currentUserId,
  })

  function set(key: string, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.empresa.trim()) return
    setIsLoading(true)
    try {
      await onSubmit({
        empresa: form.empresa,
        contacto: form.contacto,
        email: form.email,
        telefono: form.telefono,
        website: form.website,
        sector: form.sector,
        pack_interes: form.pack_interes,
        fuente: form.fuente,
        valor_estimado: form.valor_estimado,
        notas: form.notas,
        owner_id: form.asignar_a || currentUserId,
        estado: 'prospecto',
        probabilidad: 50,
        prioridad_score: 2,
        fase_proceso: '1_consultoria_gratuita',
        pais: 'España',
        has_website: !!form.website,
        fuente_apify: false,
      })
      onClose()
      setForm({ empresa: '', contacto: '', email: '', telefono: '', website: '', sector: '', pack_interes: '', fuente: '', valor_estimado: 0, notas: '', asignar_a: currentUserId })
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="border-telkora-border bg-telkora-card text-telkora-text sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-telkora-text">Nuevo lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-telkora-muted">Empresa *</Label>
            <Input
              value={form.empresa}
              onChange={(e) => set('empresa', e.target.value)}
              required
              className="border-telkora-border bg-telkora-card2 text-telkora-text"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Contacto</Label>
              <Input
                value={form.contacto}
                onChange={(e) => set('contacto', e.target.value)}
                className="border-telkora-border bg-telkora-card2 text-telkora-text"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Teléfono</Label>
              <Input
                value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)}
                className="border-telkora-border bg-telkora-card2 text-telkora-text"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className="border-telkora-border bg-telkora-card2 text-telkora-text"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Web</Label>
              <Input
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
                className="border-telkora-border bg-telkora-card2 text-telkora-text"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Sector</Label>
              <Select value={form.sector} onValueChange={(v) => set('sector', v ?? '')}>
                <SelectTrigger className="border-telkora-border bg-telkora-card2 text-telkora-text">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="border-telkora-border bg-telkora-card">
                  {SECTORES.map((s) => (
                    <SelectItem key={s} value={s} className="text-telkora-text">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-telkora-muted">Fuente</Label>
              <Select value={form.fuente} onValueChange={(v) => set('fuente', v ?? '')}>
                <SelectTrigger className="border-telkora-border bg-telkora-card2 text-telkora-text">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="border-telkora-border bg-telkora-card">
                  {FUENTES.map((f) => (
                    <SelectItem key={f} value={f} className="text-telkora-text">{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-telkora-muted">Pack de interés</Label>
            <Select value={form.pack_interes} onValueChange={(v) => set('pack_interes', v ?? '')}>
              <SelectTrigger className="border-telkora-border bg-telkora-card2 text-telkora-text">
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent className="border-telkora-border bg-telkora-card">
                {PACKS_SERVICIOS.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs text-telkora-text">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label className="text-xs text-telkora-muted">Valor estimado (EUR)</Label>
            <Input
              type="number"
              min={0}
              value={form.valor_estimado}
              onChange={(e) => set('valor_estimado', Number(e.target.value))}
              className="border-telkora-border bg-telkora-card2 text-telkora-text"
            />
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
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-telkora-border text-telkora-muted hover:bg-telkora-card2"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-telkora-accent text-telkora-bg hover:bg-telkora-accent2"
            >
              {isLoading ? 'Guardando…' : 'Crear lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
