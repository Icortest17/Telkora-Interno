export default function AjustesPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-telkora-border bg-telkora-card p-6">
        <h2 className="mb-1 text-sm font-semibold text-telkora-text">Ajustes</h2>
        <p className="text-xs text-telkora-muted">Configuración del workspace de Telkora.</p>
      </div>
      <div className="rounded-xl border border-telkora-border bg-telkora-card p-6">
        <h3 className="mb-2 text-xs font-semibold text-telkora-muted uppercase tracking-wider">Usuarios</h3>
        <p className="text-xs text-telkora-muted">
          Los usuarios se gestionan directamente desde el dashboard de Supabase Auth.
          Solo 2 usuarios permitidos: el founder y el compañero de equipo.
        </p>
      </div>
    </div>
  )
}
