'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Kanban, Users, FolderKanban, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ResultadoBusqueda {
  id: string
  label: string
  sublabel?: string
  tipo: 'lead' | 'cliente' | 'proyecto'
  href: string
}

interface BusquedaGlobalProps {
  userId: string
  esAdmin: boolean
}

export function BusquedaGlobal({ userId, esAdmin }: BusquedaGlobalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [abierto, setAbierto] = useState(false)
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([])
  const [cargando, setCargando] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Abrir con Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setAbierto((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setAbierto(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus en input cuando se abre
  useEffect(() => {
    if (abierto) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResultados([])
      setIndiceActivo(0)
    }
  }, [abierto])

  const buscar = useCallback(
    async (texto: string) => {
      if (!texto.trim() || texto.length < 2) {
        setResultados([])
        return
      }
      setCargando(true)
      try {
        const termino = `%${texto}%`

        let leadsQ = supabase
          .from('leads')
          .select('id, empresa, contacto, estado')
          .or(`empresa.ilike.${termino},contacto.ilike.${termino}`)
          .not('estado', 'in', '("cerrado_perdido","pausado")')
          .limit(5)

        let clientesQ = supabase
          .from('clientes')
          .select('id, empresa, estado')
          .ilike('empresa', termino)
          .limit(5)

        let proyectosQ = supabase
          .from('proyectos')
          .select('id, nombre, estado')
          .ilike('nombre', termino)
          .limit(5)

        if (!esAdmin) {
          leadsQ = leadsQ.eq('owner_id', userId) as typeof leadsQ
          clientesQ = clientesQ.eq('responsable_id', userId) as typeof clientesQ
          proyectosQ = proyectosQ.eq('owner_id', userId) as typeof proyectosQ
        }

        const [leadsRes, clientesRes, proyectosRes] = await Promise.all([
          leadsQ,
          clientesQ,
          proyectosQ,
        ])

        const resultadosMerge: ResultadoBusqueda[] = [
          ...(leadsRes.data ?? []).map((l) => ({
            id: l.id,
            label: l.empresa,
            sublabel: l.contacto ?? undefined,
            tipo: 'lead' as const,
            href: `/leads/${l.id}`,
          })),
          ...(clientesRes.data ?? []).map((c) => ({
            id: c.id,
            label: c.empresa,
            sublabel: c.estado,
            tipo: 'cliente' as const,
            href: `/clientes/${c.id}`,
          })),
          ...(proyectosRes.data ?? []).map((p) => ({
            id: p.id,
            label: p.nombre,
            sublabel: p.estado,
            tipo: 'proyecto' as const,
            href: `/proyectos/${p.id}`,
          })),
        ]

        setResultados(resultadosMerge)
        setIndiceActivo(0)
      } catch {
        setResultados([])
      } finally {
        setCargando(false)
      }
    },
    [supabase, userId, esAdmin]
  )

  // Debounce búsqueda
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      buscar(query)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, buscar])

  function handleKeyDownInput(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceActivo((prev) => Math.min(prev + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceActivo((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && resultados[indiceActivo]) {
      navegar(resultados[indiceActivo].href)
    }
  }

  function navegar(href: string) {
    setAbierto(false)
    router.push(href)
  }

  const TIPO_ICONS: Record<ResultadoBusqueda['tipo'], React.ElementType> = {
    lead: Kanban,
    cliente: Users,
    proyecto: FolderKanban,
  }

  const TIPO_LABELS: Record<ResultadoBusqueda['tipo'], string> = {
    lead: 'Lead',
    cliente: 'Cliente',
    proyecto: 'Proyecto',
  }

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setAbierto(false)
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-telkora-border bg-telkora-card shadow-2xl">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-telkora-border px-4 py-3">
          <Search className="size-4 flex-shrink-0 text-telkora-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownInput}
            placeholder="Buscar leads, clientes, proyectos..."
            className="flex-1 bg-transparent text-sm text-telkora-text placeholder:text-telkora-muted focus:outline-none"
          />
          {cargando && (
            <div className="size-4 animate-spin rounded-full border-2 border-telkora-border border-t-telkora-accent" />
          )}
          <button
            onClick={() => setAbierto(false)}
            className="flex items-center justify-center rounded-md border border-telkora-border p-1 text-telkora-muted hover:text-telkora-text transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Resultados */}
        {query.length >= 2 && (
          <div className="max-h-80 overflow-y-auto p-2">
            {resultados.length === 0 && !cargando ? (
              <p className="py-8 text-center text-xs text-telkora-muted">
                Sin resultados para &quot;{query}&quot;
              </p>
            ) : (
              <ul>
                {resultados.map((r, i) => {
                  const Icon = TIPO_ICONS[r.tipo]
                  return (
                    <li key={`${r.tipo}-${r.id}`}>
                      <button
                        onClick={() => navegar(r.href)}
                        onMouseEnter={() => setIndiceActivo(i)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                          i === indiceActivo
                            ? 'bg-telkora-card2 text-telkora-text'
                            : 'text-telkora-muted hover:bg-telkora-card2/50'
                        }`}
                      >
                        <div className={`flex size-7 shrink-0 items-center justify-center rounded-md border border-telkora-border ${
                          i === indiceActivo ? 'bg-telkora-accent/10' : 'bg-telkora-card2'
                        }`}>
                          <Icon className={`size-3.5 ${i === indiceActivo ? 'text-telkora-accent' : 'text-telkora-muted'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium ${i === indiceActivo ? 'text-telkora-text' : 'text-telkora-text/80'}`}>
                            {r.label}
                          </p>
                          {r.sublabel && (
                            <p className="truncate text-[11px] text-telkora-muted">{r.sublabel}</p>
                          )}
                        </div>
                        <span className="shrink-0 rounded bg-telkora-card2 px-1.5 py-0.5 text-[10px] text-telkora-muted">
                          {TIPO_LABELS[r.tipo]}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {/* Footer hint */}
        {query.length < 2 && (
          <div className="px-4 py-3">
            <p className="text-xs text-telkora-muted">
              Escribe al menos 2 caracteres para buscar
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-telkora-border px-4 py-2.5">
          <span className="text-[10px] text-telkora-muted">
            <kbd className="rounded border border-telkora-border px-1 py-0.5 font-mono">↑↓</kbd> navegar
          </span>
          <span className="text-[10px] text-telkora-muted">
            <kbd className="rounded border border-telkora-border px-1 py-0.5 font-mono">↵</kbd> abrir
          </span>
          <span className="text-[10px] text-telkora-muted">
            <kbd className="rounded border border-telkora-border px-1 py-0.5 font-mono">Esc</kbd> cerrar
          </span>
        </div>
      </div>
    </div>
  )
}

// Botón para abrir la búsqueda (para el Header)
export function BusquedaGlobalTrigger() {
  function handleClick() {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 rounded-lg border border-telkora-border bg-telkora-card2 px-3 py-1.5 text-xs text-telkora-muted hover:border-telkora-accent/50 hover:text-telkora-text transition-colors"
    >
      <Search className="size-3.5" />
      <span>Buscar...</span>
      <span className="hidden rounded border border-telkora-border px-1 py-0.5 font-mono text-[10px] sm:block">
        ⌘K
      </span>
    </button>
  )
}
