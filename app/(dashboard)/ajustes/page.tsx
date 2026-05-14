import { createClient } from '@/lib/supabase/server'
import { AjustesClient } from '@/components/ajustes/AjustesClient'

export default async function AjustesPage() {
  const supabase = await createClient()

  const [{ data: { user } }, { data: config }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('configuracion').select('*').single(),
  ])

  return <AjustesClient user={user} config={config} />
}
