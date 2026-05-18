import { createClient } from '@/lib/supabase/server'
import { AjustesClient } from '@/components/ajustes/AjustesClient'

export default async function AjustesPage() {
  const supabase = await createClient()

  const mesActual = (() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  })()

  const [{ data: { user } }, { data: config }, { data: metasData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('configuracion').select('*').single(),
    supabase
      .from('metas')
      .select('tipo, objetivo')
      .eq('mes', mesActual),
  ])

  const metasIniciales = {
    leads_cerrados: (metasData ?? []).find((m) => m.tipo === 'leads_cerrados')?.objetivo ?? 0,
    pipeline_valor: (metasData ?? []).find((m) => m.tipo === 'pipeline_valor')?.objetivo ?? 0,
    ingresos: (metasData ?? []).find((m) => m.tipo === 'ingresos')?.objetivo ?? 0,
  }

  return <AjustesClient user={user} config={config} metasIniciales={metasIniciales} />
}
