import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Cargar leads para alertas (header badge)
  const { data: leads } = await supabase
    .from('leads')
    .select('*')

  return (
    <div className="flex h-screen overflow-hidden bg-telkora-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userEmail={user.email ?? ''} leads={leads ?? []} />
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
