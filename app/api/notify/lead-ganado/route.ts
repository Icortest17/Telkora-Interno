import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { sendLeadCerradoGanado } from '@/lib/email'

export const dynamic = 'force-dynamic'

interface LeadRow {
  empresa: string
  valor_estimado: number
  owner_id: string | null
}

interface PerfilRow {
  nombre: string
}

export async function POST(request: Request): Promise<NextResponse> {
  let leadId: string

  try {
    const body: unknown = await request.json()
    if (
      typeof body !== 'object' ||
      body === null ||
      !('leadId' in body) ||
      typeof (body as Record<string, unknown>).leadId !== 'string'
    ) {
      return NextResponse.json({ error: 'leadId requerido' }, { status: 400 })
    }
    leadId = (body as { leadId: string }).leadId
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 })
  }

  try {
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Fetch the lead
    const { data: leadData, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('empresa, valor_estimado, owner_id')
      .eq('id', leadId)
      .single()

    if (leadError || !leadData) {
      console.error('[notify/lead-ganado] Lead not found:', leadError)
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })
    }

    const lead = leadData as LeadRow

    if (!lead.owner_id) {
      return NextResponse.json({ ok: true, skipped: 'no owner' })
    }

    // 2. Get owner email from auth.admin
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(lead.owner_id)

    if (userError || !userData.user?.email) {
      console.error('[notify/lead-ganado] User not found:', userError)
      return NextResponse.json({ ok: true, skipped: 'no email' })
    }

    // 3. Get owner nombre from perfiles
    const { data: perfilData } = await supabaseAdmin
      .from('perfiles')
      .select('nombre')
      .eq('user_id', lead.owner_id)
      .single()

    const perfil = perfilData as PerfilRow | null
    const nombre = perfil?.nombre ?? userData.user.email

    // 4. Send email (errors are swallowed inside sendLeadCerradoGanado)
    await sendLeadCerradoGanado(
      userData.user.email,
      nombre,
      lead.empresa,
      lead.valor_estimado
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[notify/lead-ganado] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
