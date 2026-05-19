'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LeadKanban } from '@/components/leads/LeadKanban'
import { toast } from 'sonner'
import type { Lead, EstadoLead } from '@/types'
import type { Usuario } from '@/lib/profile'
import { ESTADOS_LEAD } from '@/lib/constants'

interface Props {
  initialLeads: Lead[]
  currentUserId: string
  usuarios?: Usuario[]
  esAdmin?: boolean
}

export function LeadKanbanWrapper({ initialLeads, currentUserId, usuarios = [], esAdmin = false }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const supabase = createClient()

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setLeads(data)
  }, [supabase])

  const updateEstado = useCallback(
    async (leadId: string, nuevoEstado: EstadoLead, userId: string) => {
      const lead = leads.find((l) => l.id === leadId)
      if (!lead) return
      // Optimistic update
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, estado: nuevoEstado } : l))

      // Undo toast for 5 seconds
      let undone = false
      const toastId = toast(`Estado cambiado a "${ESTADOS_LEAD[nuevoEstado].label}"`, {
        action: {
          label: 'Deshacer',
          onClick: () => {
            undone = true
            setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, estado: lead.estado } : l))
          },
        },
        duration: 5000,
      })

      // Wait 5s, then persist if not undone
      await new Promise<void>((resolve) => setTimeout(resolve, 5000))
      toast.dismiss(toastId)
      if (undone) return

      try {
        const { error } = await supabase.from('leads').update({ estado: nuevoEstado }).eq('id', leadId)
        if (error) throw error

        // Fire-and-forget notification when a lead is won
        if (nuevoEstado === 'cerrado_ganado') {
          fetch('/api/notify/lead-ganado', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId }),
          }).catch((notifyErr: unknown) => {
            console.error('[LeadKanbanWrapper] notify/lead-ganado error:', notifyErr)
          })
        }

        await supabase.from('lead_actividades').insert({
          lead_id: leadId,
          usuario_id: userId,
          tipo: 'cambio_estado',
          contenido: `Estado cambiado de "${lead.estado}" a "${nuevoEstado}"`,
          estado_anterior: lead.estado,
          estado_nuevo: nuevoEstado,
        })

        // Auto-create cliente when lead closes as won
        if (nuevoEstado === 'cerrado_ganado' && lead.estado !== 'cerrado_ganado') {
          const { data: existingCliente } = await supabase
            .from('clientes')
            .select('id')
            .eq('lead_origen_id', leadId)
            .maybeSingle()

          if (!existingCliente) {
            const { data: newCliente } = await supabase.from('clientes').insert({
              empresa: lead.empresa,
              contacto: lead.contacto ?? null,
              email: lead.email ?? null,
              telefono: lead.telefono ?? null,
              website: lead.website ?? null,
              sector: lead.sector ?? null,
              pais: lead.pais ?? 'España',
              lead_origen_id: leadId,
              estado: 'activo',
              mrr: 0,
              valor_total_contrato: lead.valor_estimado ?? 0,
              responsable_id: lead.owner_id,
              fecha_inicio_relacion: new Date().toISOString().split('T')[0],
            }).select().single()

            if (newCliente) {
              toast.success(`Cliente "${lead.empresa}" creado automáticamente`)
            }
          }
        }
      } catch {
        // Revert optimistic update on error
        setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, estado: lead.estado } : l))
        toast.error('Error al actualizar el estado. Comprueba tu conexión.')
      }
    },
    [leads, supabase]
  )

  const updateFollowup = useCallback(async (leadId: string, fecha: string | null) => {
    const prevLead = leads.find((l) => l.id === leadId)
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, proximo_followup: fecha } : l))
    try {
      const { error } = await supabase.from('leads').update({ proximo_followup: fecha }).eq('id', leadId)
      if (error) throw error
      toast.success('Follow-up actualizado')
    } catch {
      if (prevLead) {
        setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, proximo_followup: prevLead.proximo_followup } : l))
      }
      toast.error('Error actualizando follow-up. Comprueba tu conexión.')
    }
  }, [leads, supabase])

  const bulkUpdateEstado = useCallback(async (ids: string[], nuevoEstado: EstadoLead) => {
    const prevEstados = leads.filter((l) => ids.includes(l.id)).map((l) => ({ id: l.id, estado: l.estado }))
    setLeads((prev) => prev.map((l) => ids.includes(l.id) ? { ...l, estado: nuevoEstado } : l))
    try {
      const { error } = await supabase.from('leads').update({ estado: nuevoEstado }).in('id', ids)
      if (error) throw error
      toast.success(`${ids.length} lead${ids.length !== 1 ? 's' : ''} actualizados`)
    } catch {
      setLeads((prev) => prev.map((l) => {
        const prev_ = prevEstados.find((p) => p.id === l.id)
        return prev_ ? { ...l, estado: prev_.estado } : l
      }))
      toast.error('Error en actualización masiva. Comprueba tu conexión.')
    }
  }, [leads, supabase])

  const bulkAssign = useCallback(async (ids: string[], userId: string) => {
    const prevOwners = leads.filter((l) => ids.includes(l.id)).map((l) => ({ id: l.id, owner_id: l.owner_id }))
    setLeads((prev) => prev.map((l) => ids.includes(l.id) ? { ...l, owner_id: userId } : l))
    try {
      const { error } = await supabase.from('leads').update({ owner_id: userId }).in('id', ids)
      if (error) throw error
      toast.success(`${ids.length} lead${ids.length !== 1 ? 's' : ''} reasignados`)
    } catch {
      setLeads((prev) => prev.map((l) => {
        const prev_ = prevOwners.find((p) => p.id === l.id)
        return prev_ ? { ...l, owner_id: prev_.owner_id } : l
      }))
      toast.error('Error en reasignación masiva. Comprueba tu conexión.')
    }
  }, [leads, supabase])

  const createLead = useCallback(
    async (data: Partial<Lead>) => {
      try {
        const payload = { ...data, owner_id: data.owner_id || currentUserId }
        const { data: newLead, error } = await supabase.from('leads').insert(payload).select().single()
        if (error) throw error
        setLeads((prev) => [newLead, ...prev])
        toast.success('Lead creado')
        return newLead
      } catch {
        toast.error('Error creando lead')
        return null
      }
    },
    [supabase, currentUserId]
  )

  return (
    <LeadKanban
      leads={leads}
      currentUserId={currentUserId}
      usuarios={usuarios}
      esAdmin={esAdmin}
      onUpdateEstado={updateEstado}
      onUpdateFollowup={updateFollowup}
      onBulkUpdateEstado={bulkUpdateEstado}
      onBulkAssign={bulkAssign}
      onCreateLead={createLead}
      onRefresh={refresh}
    />
  )
}
