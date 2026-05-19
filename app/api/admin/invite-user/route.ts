import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// In-memory rate limit: max 10 invites per hour per admin
const inviteRateLimit = new Map<string, { count: number; resetAt: number }>()

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Verify caller is authenticated AND admin
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Check admin role
  const { data: perfil } = await supabaseAuth
    .from('perfiles')
    .select('rol')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admins pueden invitar usuarios' }, { status: 403 })
  }

  // Rate limit: max 10 invites per hour per admin
  const now = Date.now()
  const limit = inviteRateLimit.get(user.id)
  if (limit && limit.resetAt > now && limit.count >= 10) {
    return NextResponse.json({ error: 'Demasiadas invitaciones. Intenta en 1 hora.' }, { status: 429 })
  }
  inviteRateLimit.set(user.id, {
    count: (limit && limit.resetAt > now ? limit.count : 0) + 1,
    resetAt: limit && limit.resetAt > now ? limit.resetAt : now + 3600000,
  })

  // 2. Parse body
  let email: string, nombre: string
  try {
    const body = await request.json() as { email: string; nombre: string }
    email = body.email?.trim().toLowerCase()
    nombre = body.nombre?.trim()
    if (!email || !nombre) throw new Error('Missing fields')
  } catch {
    return NextResponse.json({ error: 'email y nombre son requeridos' }, { status: 400 })
  }

  // 3. Invite via Supabase Auth Admin (sends magic-link email)
  const adminClient = createAdminClient()
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { nombre },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  })

  if (inviteError) {
    console.error('[invite-user] Error:', inviteError)
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  // 4. Create profile with 'socio' role
  const newUserId = inviteData.user.id
  const { error: perfilError } = await adminClient
    .from('perfiles')
    .upsert(
      { user_id: newUserId, nombre, rol: 'socio' },
      { onConflict: 'user_id' }
    )

  if (perfilError) {
    console.error('[invite-user] Error creating perfil:', perfilError)
    // Don't fail — user was created, profile can be fixed manually
  }

  return NextResponse.json({ ok: true, userId: newUserId })
}
