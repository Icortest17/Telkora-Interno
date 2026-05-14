'use client'

import { useMemo } from 'react'
import { isToday, isPast, addDays, subDays } from 'date-fns'
import type { Lead, Alerta } from '@/types'

const ESTADOS_CERRADOS = ['cerrado_ganado', 'cerrado_perdido'] as const

export function useAlertas(leads: Lead[]) {
  return useMemo(() => {
    const alertas: Alerta[] = []
    const hoy = new Date()

    for (const lead of leads) {
      if (ESTADOS_CERRADOS.includes(lead.estado as typeof ESTADOS_CERRADOS[number])) continue

      if (lead.proximo_followup) {
        const fecha = new Date(lead.proximo_followup)
        if (isToday(fecha) || isPast(fecha)) {
          alertas.push({ lead, tipo: 'urgente' })
          continue
        }
        if (fecha <= addDays(hoy, 3)) {
          alertas.push({ lead, tipo: 'proximo' })
          continue
        }
      } else {
        // Sin follow-up asignado y sin actividad reciente (usamos created_at como proxy)
        const hace7dias = subDays(hoy, 7)
        if (new Date(lead.updated_at) < hace7dias) {
          alertas.push({ lead, tipo: 'sin_followup' })
        }
      }
    }

    return {
      alertas,
      urgentes: alertas.filter((a) => a.tipo === 'urgente'),
      proximas: alertas.filter((a) => a.tipo === 'proximo'),
      sinFollowup: alertas.filter((a) => a.tipo === 'sin_followup'),
      totalUrgentes: alertas.filter((a) => a.tipo === 'urgente').length,
    }
  }, [leads])
}
