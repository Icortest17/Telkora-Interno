import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { sendFollowupUrgente } from '@/lib/email'
import type { FollowupLead } from '@/lib/email'

// This endpoint is called by Vercel Cron (see vercel.json)
// Protected by Authorization: Bearer <CRON_SECRET>
export const dynamic = 'force-dynamic'

interface PerfilRow {
  user_id: string
  nombre: string
}

interface LeadRow {
  empresa: string
  estado: string
  proximo_followup: string
}

export async function GET(request: Request): Promise<NextResponse> {
  // Auth check
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Get all perfiles
  const { data: perfiles, error: perfilesError } = await supabaseAdmin
    .from('perfiles')
    .select('user_id, nombre')

  if (perfilesError) {
    console.error('[cron/followups] Error fetching perfiles:', perfilesError)
    return NextResponse.json({ error: perfilesError.message }, { status: 500 })
  }

  const rows = (perfiles ?? []) as PerfilRow[]

  if (rows.length === 0) {
    return NextResponse.json({ processed: 0, notified: 0 })
  }

  // 2. Get all user emails from auth.users in one call
  const { data: usersData, error: usersError } =
    await supabaseAdmin.auth.admin.listUsers()

  if (usersError) {
    console.error('[cron/followups] Error listing users:', usersError)
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  // Build userId -> email map
  const emailMap = new Map<string, string>()
  for (const u of usersData.users) {
    if (u.email) emailMap.set(u.id, u.email)
  }

  const now = new Date().toISOString()
  const closedStates = ['cerrado_ganado', 'cerrado_perdido']

  let notified = 0

  for (const perfil of rows) {
    const email = emailMap.get(perfil.user_id)
    if (!email) continue

    // 3. Leads with overdue followup for this user
    const { data: leadsData, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('empresa, estado, proximo_followup')
      .eq('owner_id', perfil.user_id)
      .lt('proximo_followup', now)
      .not('estado', 'in', `(${closedStates.join(',')})`)

    if (leadsError) {
      console.error(
        `[cron/followups] Error fetching leads for ${perfil.user_id}:`,
        leadsError
      )
      continue
    }

    const leads = (leadsData ?? []) as LeadRow[]
    if (leads.length === 0) continue

    const payload: FollowupLead[] = leads.map((l) => {
      const due = new Date(l.proximo_followup)
      const diffMs = Date.now() - due.getTime()
      const dias = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      return { empresa: l.empresa, estado: l.estado, dias }
    })

    await sendFollowupUrgente(email, perfil.nombre, payload)
    notified++
  }

  return NextResponse.json({ processed: rows.length, notified })
}
