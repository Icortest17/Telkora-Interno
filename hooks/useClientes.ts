'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Cliente } from '@/types'

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchClientes = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('mrr', { ascending: false })
      if (error) throw error
      setClientes(data ?? [])
    } catch (error) {
      toast.error('Error cargando clientes')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  const updateCliente = useCallback(
    async (clienteId: string, updates: Partial<Cliente>) => {
      try {
        const { data, error } = await supabase
          .from('clientes')
          .update(updates)
          .eq('id', clienteId)
          .select()
          .single()
        if (error) throw error
        setClientes((prev) => prev.map((c) => (c.id === clienteId ? data : c)))
        return data
      } catch (error) {
        toast.error('Error guardando cambios')
        console.error(error)
        return null
      }
    },
    [supabase]
  )

  const createCliente = useCallback(
    async (cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'tier'>) => {
      try {
        const { data, error } = await supabase
          .from('clientes')
          .insert(cliente)
          .select()
          .single()
        if (error) throw error
        setClientes((prev) => [data, ...prev])
        toast.success('Cliente creado correctamente')
        return data
      } catch (error) {
        toast.error('Error creando cliente')
        console.error(error)
        return null
      }
    },
    [supabase]
  )

  return { clientes, isLoading, fetchClientes, updateCliente, createCliente }
}
