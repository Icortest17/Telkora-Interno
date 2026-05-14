import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/profile'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const perfil = await getPerfil()

  if (!perfil) redirect('/login')

  // Leads para badge de alertas — filtrado por rol
  let leadsQuery = supabase.from('leads').select('*')
  if (perfil.rol === 'socio') leadsQuery = leadsQuery.eq('owner_id', perfil.userId) as typeof leadsQuery
  const { data: leads } = await leadsQuery

  return (
    <div className="flex h-screen overflow-hidden bg-telkora-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userEmail={perfil.email} leads={leads ?? []} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: '#111111',
            border: '1px solid #222222',
            color: '#FFFFFF',
          },
        }}
      />
    </div>
  )
}
