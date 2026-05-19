export default function InformesLoading() {
  return (
    <div className="space-y-4">
      {/* Tab bar skeleton */}
      <div className="flex gap-1 rounded-xl border border-telkora-border bg-telkora-card p-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 flex-1 animate-pulse rounded-lg bg-telkora-card2" />
        ))}
      </div>
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-telkora-border bg-telkora-card" />
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="h-64 animate-pulse rounded-xl border border-telkora-border bg-telkora-card" />
      {/* Table skeleton */}
      <div className="h-48 animate-pulse rounded-xl border border-telkora-border bg-telkora-card" />
    </div>
  )
}
