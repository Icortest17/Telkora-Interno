'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LeadKanban } from '@/components/leads/LeadKanban'
import { toast } from 'sonner'
import type { Lead, EstadoLead } from '@/types'

interface Props {
  initialLeads: Lead[]
  currentUserId: string
}

export function LeadKanbanWrapper({ initialLeads, currentUserId }: Props) {
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

  const createLead = useCallback(
    async (data: Partial<Lead>) => {
      try {
        const { data: newLead, error } = await supabase.from('leads').insert(data).select().single()
        if (error) throw error
        setLeads((prev) => [newLead, ...prev])
        toast.success('Lead creado')
        return newLead
      } catch {
        toast.error('Error creando lead')
        return null
      }
    },
    [supabase]
  )

  return (
    <LeadKanban
      leads={leads}
      currentUserId={currentUserId}
      onUpdateEstado={updateEstado}
      onCreateLead={createLead}
      onRefresh={refresh}
    />
  )
}
