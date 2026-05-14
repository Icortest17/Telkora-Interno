export type EstadoLead =
  | 'prospecto'
  | 'contactado'
  | 'reunion'
  | 'propuesta'
  | 'negociacion'
  | 'cerrado_ganado'
  | 'cerrado_perdido'
  | 'pausado'

export type PrioridadScore = 1 | 2 | 3

export type TipoActividad =
  | 'nota'
  | 'llamada'
  | 'email'
  | 'whatsapp'
  | 'reunion'
  | 'cambio_estado'
  | 'propuesta'

export interface Lead {
  id: string
  created_at: string
  updated_at: string
  empresa: string
  contacto: string | null
  email: string | null
  telefono: string | null
  website: string | null
  sector: string | null
  pais: string
  estado: EstadoLead
  valor_estimado: number
  probabilidad: number
  valor_ponderado: number
  pack_interes: string | null
  fuente: string | null
  fase_proceso: string
  prioridad_score: PrioridadScore
  owner_id: string | null
  responsable_id: string | null
  fecha_primer_contacto: string | null
  proximo_followup: string | null
  notas: string | null
  etiquetas: string[] | null
  has_website: boolean
  website_quality: string | null
  rating: number | null
  review_count: number | null
  fuente_apify: boolean
}

export interface LeadActividad {
  id: string
  created_at: string
  lead_id: string
  usuario_id: string
  tipo: TipoActividad
  contenido: string
  estado_anterior: string | null
  estado_nuevo: string | null
}

export interface Cliente {
  id: string
  created_at: string
  updated_at: string
  lead_origen_id: string | null
  empresa: string
  contacto: string | null
  email: string | null
  telefono: string | null
  website: string | null
  sector: string | null
  pais: string
  estado: 'activo' | 'pausado' | 'churned' | 'upsell'
  tier: 'gold' | 'silver' | 'bronze'
  mrr: number
  valor_total_contrato: number
  fecha_inicio_relacion: string | null
  nps: number | null
  responsable_id: string | null
  proxima_revision: string | null
  notas: string | null
}

export interface Proyecto {
  id: string
  created_at: string
  updated_at: string
  cliente_id: string
  nombre: string
  tipo_proyecto: string | null
  estado: 'briefing' | 'desarrollo' | 'revision' | 'entregado' | 'mantenimiento' | 'pausado' | 'cancelado'
  owner_id: string | null
  responsable_id: string | null
  fecha_inicio: string | null
  fecha_entrega_estimada: string | null
  fecha_entrega_real: string | null
  presupuesto: number | null
  facturado: number
  porcentaje_completado: number
  prioridad: 'alta' | 'media' | 'baja'
  descripcion: string | null
}

export interface Transaccion {
  id: string
  created_at: string
  owner_id: string | null
  tipo: 'ingreso' | 'gasto'
  concepto: string
  importe: number
  cliente_id: string | null
  proyecto_id: string | null
  categoria: string | null
  es_recurrente: boolean
  fecha_cobro: string | null
  estado: 'pendiente' | 'enviada' | 'cobrada' | 'vencida'
  notas: string | null
}

export interface ApifyCSVRow {
  Name: string
  Address: string
  Phone: string
  Website: string
  Email: string
  Rating: string
  ReviewCount: string
  Category: string
  HasWebsite: string
  WebsiteQuality: string
  PriorityScore: string
}

export interface Alerta {
  lead: Lead
  tipo: 'urgente' | 'proximo' | 'sin_followup'
}

export interface MetricasDashboard {
  leadsActivos: number
  mrrActual: number
  valorPipeline: number
  proyectosActivos: number
}
