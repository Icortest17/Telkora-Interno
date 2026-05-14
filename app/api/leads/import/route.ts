import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ApifyCSVRow } from '@/types'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { rows, sectorDefault }: { rows: ApifyCSVRow[]; sectorDefault: string } =
    await request.json()

  const leadsToUpsert = rows.map((row) => ({
    empresa: row.Name?.trim() || 'Sin nombre',
    telefono: row.Phone?.trim() || null,
    website: row.Website?.trim() || null,
    email: row.Email?.trim() || null,
    rating: row.Rating ? parseFloat(row.Rating) : null,
    review_count: row.ReviewCount ? parseInt(row.ReviewCount) : null,
    sector: sectorDefault || row.Category?.trim() || null,
    has_website: row.HasWebsite?.toLowerCase() === 'true',
    website_quality: row.WebsiteQuality?.trim() || null,
    prioridad_score: Math.min(3, Math.max(1, parseInt(row.PriorityScore) || 2)) as 1 | 2 | 3,
    estado: 'prospecto' as const,
    fuente_apify: true,
    fuente: 'Apify Google Maps',
    pais: 'España',
    fase_proceso: '1_consultoria_gratuita' as const,
    probabilidad: 50,
  }))

  // Upsert por empresa + telefono
  const { data, error } = await supabase
    .from('leads')
    .upsert(leadsToUpsert, {
      onConflict: 'empresa,telefono',
      ignoreDuplicates: true,
    })
    .select()

  if (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const importados = data?.length ?? 0
  const ignorados = leadsToUpsert.length - importados

  return NextResponse.json({ importados, ignorados })
}
