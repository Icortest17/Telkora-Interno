import { createClient } from '@/lib/supabase/server'
import { CalendarioClient } from '@/components/calendario/CalendarioClient'
import { isToday, isThisWeek, isThisMonth, isPast, startOfDay } from 'date-fns'
import type { Lead } from '@/types'

const ESTADOS_EXCLUIDOS = ['cerrado_ganado', 'cerrado_perdido', 'pausado']

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('leads')
    .select('*')
    .not('proximo_followup', 'is', null)
    .not('estado', 'in', `(${ESTADOS_EXCLUIDOS.map((e) => `"${e}"`).join(',')})`)
    .order('proximo_followup', { ascending: true })
  const leads: Lead[] = data ?? []

  const hoy = startOfDay(new Date())

  const vencidos: Lead[] = []
  const hoyLeads: Lead[] = []
  const estaSemana: Lead[] = []
  const esteMes: Lead[] = []
  const masAdelante: Lead[] = []

  for (const lead of leads) {
    const fecha = new Date(lead.proximo_followup!)
    const fechaDia = startOfDay(fecha)

    if (isToday(fechaDia)) {
      hoyLeads.push(lead)
    } else if (isPast(fechaDia) && fechaDia < hoy) {
      vencidos.push(lead)
    } else if (isThisWeek(fechaDia, { weekStartsOn: 1 })) {
      estaSemana.push(lead)
    } else if (isThisMonth(fechaDia)) {
      esteMes.push(lead)
    } else {
      masAdelante.push(lead)
    }
  }

  const grupos = [
    { label: 'Vencidos', leads: vencidos, urgente: true },
    { label: 'Hoy', leads: hoyLeads, urgente: true },
    { label: 'Esta semana', leads: estaSemana, urgente: false },
    { label: 'Este mes', leads: esteMes, urgente: false },
    { label: 'Más adelante', leads: masAdelante, urgente: false },
  ]

  return <CalendarioClient grupos={grupos} />
}
