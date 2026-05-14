'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/')
      router.refresh()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al iniciar sesión'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-telkora-bg">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-telkora-accent">Telkora</span>
          </h1>
          <p className="mt-1 text-sm text-telkora-muted">Gestión interna de agencia</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-telkora-border bg-telkora-card p-8">
          <h2 className="mb-6 text-sm font-medium text-telkora-muted">Acceder al sistema</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-telkora-muted">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@telkora.com"
                required
                className="border-telkora-border bg-telkora-card2 text-telkora-text placeholder:text-telkora-muted/50 focus-visible:ring-telkora-accent"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-telkora-muted">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="border-telkora-border bg-telkora-card2 text-telkora-text placeholder:text-telkora-muted/50 focus-visible:ring-telkora-accent"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full bg-telkora-accent font-semibold text-telkora-bg hover:bg-telkora-accent2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Accediendo…
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>
      </div>
      <Toaster theme="dark" />
    </div>
  )
}
