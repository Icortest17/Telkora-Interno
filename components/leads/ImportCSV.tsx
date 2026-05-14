'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UploadCloud, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { SECTORES } from '@/lib/constants'
import type { ApifyCSVRow } from '@/types'

interface ImportCSVProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ImportResult {
  importados: number
  ignorados: number
}

export function ImportCSV({ open, onClose, onSuccess }: ImportCSVProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ApifyCSVRow[]>([])
  const [sectorDefault, setSectorDefault] = useState('')
  const [filterScore, setFilterScore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  function handleFile(file: File) {
    Papa.parse<ApifyCSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => setRows(r.data),
      error: () => toast.error('Error leyendo el CSV'),
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const filteredRows = filterScore
    ? rows.filter((r) => parseInt(r.PriorityScore) >= 2)
    : rows

  async function handleImport() {
    if (!filteredRows.length) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: filteredRows, sectorDefault }),
      })
      if (!res.ok) throw new Error('Error en el servidor')
      const data: ImportResult = await res.json()
      setResult(data)
      onSuccess()
    } catch {
      toast.error('Error importando leads')
    } finally {
      setIsLoading(false)
    }
  }

  function handleClose() {
    setRows([])
    setResult(null)
    setSectorDefault('')
    setFilterScore(true)
    onClose()
  }

  if (!open) return null

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="border-telkora-border bg-telkora-card text-telkora-text sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-telkora-text">Importar leads desde Apify</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="size-12 text-telkora-accent" />
            <div className="text-center">
              <p className="text-lg font-semibold text-telkora-text">
                {result.importados} leads importados
              </p>
              <p className="text-sm text-telkora-muted">
                {result.ignorados} duplicados ignorados
              </p>
            </div>
            <Button
              onClick={handleClose}
              className="bg-telkora-accent text-telkora-bg hover:bg-telkora-accent2"
            >
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Dropzone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-telkora-border bg-telkora-card2 p-8 transition-colors hover:border-telkora-accent/50"
            >
              <UploadCloud className="mb-3 size-8 text-telkora-muted" />
              <p className="text-sm text-telkora-text">Arrastra el archivo CSV aquí</p>
              <p className="text-xs text-telkora-muted">o haz clic para seleccionar</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleInput}
              />
            </div>

            {rows.length > 0 && (
              <>
                <div className="flex items-center gap-4">
                  <p className="text-sm text-telkora-muted">
                    <span className="font-medium text-telkora-text">{rows.length}</span> filas detectadas
                    {filterScore && (
                      <> · <span className="font-medium text-telkora-accent">{filteredRows.length}</span> con PriorityScore ≥ 2</>
                    )}
                  </p>
                </div>

                {/* Config */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-telkora-muted">Sector por defecto</Label>
                    <Select value={sectorDefault} onValueChange={(v) => setSectorDefault(v ?? '')}>
                      <SelectTrigger className="border-telkora-border bg-telkora-card2 text-telkora-text">
                        <SelectValue placeholder="Del CSV (Category)" />
                      </SelectTrigger>
                      <SelectContent className="border-telkora-border bg-telkora-card">
                        <SelectItem value="" className="text-telkora-muted">Del CSV (Category)</SelectItem>
                        {SECTORES.map((s) => (
                          <SelectItem key={s} value={s} className="text-telkora-text">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-telkora-muted">
                      <input
                        type="checkbox"
                        checked={filterScore}
                        onChange={(e) => setFilterScore(e.target.checked)}
                        className="accent-telkora-accent"
                      />
                      Solo PriorityScore ≥ 2
                    </label>
                  </div>
                </div>

                {/* Preview table */}
                <div className="overflow-hidden rounded-lg border border-telkora-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-telkora-border bg-telkora-card2">
                        <th className="px-3 py-2 text-left text-telkora-muted">Empresa</th>
                        <th className="px-3 py-2 text-left text-telkora-muted">Teléfono</th>
                        <th className="px-3 py-2 text-left text-telkora-muted">Sector</th>
                        <th className="px-3 py-2 text-left text-telkora-muted">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b border-telkora-border/50">
                          <td className="px-3 py-2 text-telkora-text">{row.Name}</td>
                          <td className="px-3 py-2 text-telkora-muted">{row.Phone}</td>
                          <td className="px-3 py-2 text-telkora-muted">{row.Category}</td>
                          <td className="px-3 py-2">
                            <span className={`font-medium ${
                              parseInt(row.PriorityScore) === 3 ? 'text-telkora-danger' :
                              parseInt(row.PriorityScore) === 2 ? 'text-telkora-warning' :
                              'text-telkora-muted'
                            }`}>
                              {row.PriorityScore}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredRows.length > 10 && (
                    <div className="px-3 py-2 text-center text-xs text-telkora-muted">
                      +{filteredRows.length - 10} más
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="border-telkora-border text-telkora-muted hover:bg-telkora-card2"
                  >
                    Cancelar
                  </Button>
                  <Button
                    disabled={isLoading || filteredRows.length === 0}
                    onClick={handleImport}
                    className="bg-telkora-accent text-telkora-bg hover:bg-telkora-accent2"
                  >
                    {isLoading
                      ? 'Importando…'
                      : `Importar ${filteredRows.length} leads`}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
