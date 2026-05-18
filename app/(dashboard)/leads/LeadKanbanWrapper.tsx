'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LeadKanban } from '@/components/leads/LeadKanban'
import { toast } from 'sonner'
import type { Lead, EstadoLead } from '@/types'
import type { Usuario } from '@/lib/profile'

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
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, estado: nuevoEstado } : l))
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
        toast.success(`Movido a ${nuevoEstado.replace('_', ' ')}`)
      } catch {
        setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, estado: lead.estado } : l))
        toast.error('Error actualizando estado')
      }
    },
    [leads, supabase]
  )

  const updateFollowup = useCallback(async (leadId: string, fecha: string | null) => {
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, proximo_followup: fecha } : l))
    try {
      const { error } = await supabase.from('leads').update({ proximo_followup: fecha }).eq('id', leadId)
      if (error) throw error
      toast.success('Follow-up actualizado')
    } catch {
      toast.error('Error actualizando follow-up')
    }
  }, [supabase])

  const bulkUpdateEstado = useCallback(async (ids: string[], nuevoEstado: EstadoLead) => {
    setLeads((prev) => prev.map((l) => ids.includes(l.id) ? { ...l, estado: nuevoEstado } : l))
    try {
      const { error } = await supabase.from('leads').update({ estado: nuevoEstado }).in('id', ids)
      if (error) throw error
      toast.success(`${ids.length} lead${ids.length !== 1 ? 's' : ''} actualizados`)
    } catch {
      toast.error('Error en actualización masiva')
    }
  }, [supabase])

  const bulkAssign = useCallback(async (ids: string[], userId: string) => {
    setLeads((prev) => prev.map((l) => ids.includes(l.id) ? { ...l, owner_id: userId } : l))
    try {
      const { error } = await supabase.from('leads').update({ owner_id: userId }).in('id', ids)
      if (error) throw error
      toast.success(`${ids.length} lead${ids.length !== 1 ? 's' : ''} reasignados`)
    } catch {
      toast.error('Error en reasignación masiva')
    }
  }, [supabase])

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
