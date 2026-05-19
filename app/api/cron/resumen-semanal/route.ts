import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { sendResumenSemanal } from '@/lib/email'
import type { ResumenUsuario } from '@/lib/email'
import { subDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: perfiles } = await supabaseAdmin.from('perfiles').select('user_id, nombre')
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
  const emailMap = new Map<string, string>()
  for (const u of (usersData?.users ?? [])) {
    if (u.email) emailMap.set(u.id, u.email)
  }

  const now = new Date()
  const hace7dias = subDays(now, 7).toISOString()
  const mesActual = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  let notified = 0

  for (const perfil of (perfiles ?? [])) {
    const email = emailMap.get(perfil.user_id)
    if (!email) continue

    const [leadsRes, metasRes] = await Promise.all([
      supabaseAdmin.from('leads').select('estado, valor_ponderado, proximo_followup, updated_at, created_at').eq('owner_id', perfil.user_id),
      supabaseAdmin.from('metas').select('tipo, objetivo').eq('user_id', perfil.user_id).eq('mes', mesActual),
    ])

    const leads = leadsRes.data ?? []
    const metas = metasRes.data ?? []

    const leadsActivos = leads.filter(l => !['cerrado_ganado', 'cerrado_perdido', 'pausado'].includes(l.estado))
    const leadsUrgentes = leadsActivos.filter(l => l.proximo_followup && new Date(l.proximo_followup) < now).length
    const leadsInactivos = leadsActivos.filter(l => new Date((l.updated_at as string | null) ?? (l.created_at as string)) < new Date(hace7dias)).length
    const leadsCerradosSemana = leads.filter(l => l.estado === 'cerrado_ganado' && new Date((l.updated_at as string | null) ?? (l.created_at as string)) >= new Date(hace7dias)).length
    const valorPipeline = leads.filter(l => ['contactado', 'reunion', 'propuesta', 'negociacion'].includes(l.estado)).reduce((s, l) => s + ((l.valor_ponderado as number | null) ?? 0), 0)

    const metaLeads = (metas.find(m => m.tipo === 'leads_cerrados')?.objetivo as number | undefined) ?? 0
    const metaValor = (metas.find(m => m.tipo === 'pipeline_valor')?.objetivo as number | undefined) ?? 0
    const leadsCerradosMes = leads.filter(l => l.estado === 'cerrado_ganado').length
    const progresoLeads = metaLeads > 0 ? Math.round(leadsCerradosMes / metaLeads * 100) : 0
    const progresoValor = metaValor > 0 ? Math.round(valorPipeline / metaValor * 100) : 0

    const data: ResumenUsuario = {
      nombre: perfil.nombre as string,
      leadsUrgentes,
      leadsInactivos,
      leadsCerradosSemana,
      valorPipeline,
      metaLeads,
      metaValor,
      progresoLeads,
      progresoValor,
    }

    await sendResumenSemanal(email, data)
    notified++
  }

  return NextResponse.json({ processed: perfiles?.length ?? 0, notified })
}
