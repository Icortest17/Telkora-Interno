'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Lead, EstadoLead, LeadActividad } from '@/types'

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchLeads = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setLeads(data ?? [])
    } catch (error) {
      toast.error('Error cargando leads')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const updateLeadEstado = useCallback(
    async (leadId: string, nuevoEstado: EstadoLead, usuarioId: string) => {
      const lead = leads.find((l) => l.id === leadId)
      if (!lead) return

      // Optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, estado: nuevoEstado } : l))
      )

      try {
        const { error } = await supabase
          .from('leads')
          .update({ estado: nuevoEstado })
          .eq('id', leadId)
        if (error) throw error

        // Registrar actividad de cambio de estado
        await supabase.from('lead_actividades').insert({
          lead_id: leadId,
          usuario_id: usuarioId,
          tipo: 'cambio_estado',
          contenido: `Estado cambiado de "${lead.estado}" a "${nuevoEstado}"`,
          estado_anterior: lead.estado,
          estado_nuevo: nuevoEstado,
        })
      } catch (error) {
        // Revertir optimistic update
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, estado: lead.estado } : l))
        )
        toast.error('Error actualizando estado')
        console.error(error)
      }
    },
    [leads, supabase]
  )

  const updateLead = useCallback(
    async (leadId: string, updates: Partial<Lead>) => {
      try {
        const { data, error } = await supabase
          .from('leads')
          .update(updates)
          .eq('id', leadId)
          .select()
          .single()
        if (error) throw error
        setLeads((prev) => prev.map((l) => (l.id === leadId ? data : l)))
        return data
      } catch (error) {
        toast.error('Error guardando cambios')
        console.error(error)
        return null
      }
    },
    [supabase]
  )

  const createLead = useCallback(
    async (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'valor_ponderado'>) => {
      try {
        const { data, error } = await supabase
          .from('leads')
          .insert(lead)
          .select()
          .single()
        if (error) throw error
        setLeads((prev) => [data, ...prev])
        toast.success('Lead creado correctamente')
        return data
      } catch (error) {
        toast.error('Error creando lead')
        console.error(error)
        return null
      }
    },
    [supabase]
  )

  return { leads, isLoading, fetchLeads, updateLeadEstado, updateLead, createLead }
}

export function useLeadActividades(leadId: string) {
  const [actividades, setActividades] = useState<LeadActividad[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetch() {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('lead_actividades')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
        if (error) throw error
        setActividades(data ?? [])
      } catch (error) {
        toast.error('Error cargando actividades')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [leadId, supabase])

  const addActividad = useCallback(
    async (actividad: Omit<LeadActividad, 'id' | 'created_at'>) => {
      try {
        const { data, error } = await supabase
          .from('lead_actividades')
          .insert(actividad)
          .select()
          .single()
        if (error) throw error
        setActividades((prev) => [data, ...prev])
        return data
      } catch (error) {
        toast.error('Error registrando actividad')
        console.error(error)
        return null
      }
    },
    [supabase]
  )

  return { actividades, isLoading, addActividad }
}
