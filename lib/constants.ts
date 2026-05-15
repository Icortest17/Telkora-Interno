import type { EstadoLead } from '@/types'

export const SECTORES = [
  'Inmobiliario',
  'E-commerce',
  'Salud / Clínicas',
  'Hostelería',
  'Agencia de marketing',
  'Servicios profesionales (legal / gestoría)',
  'Retail',
  'SaaS',
  'Educación',
  'Finanzas',
  'Industria',
  'Otro',
]

export const FUENTES = [
  'Apify Google Maps',
  'LinkedIn',
  'Referido',
  'Web',
  'Evento',
  'Cold outreach',
  'Asociado',
  'Otro',
]

export const PACKS_SERVICIOS = [
  'Pack Starter (1.800-2.500 EUR)',
  'Pack Growth (4.500-7.000 EUR)',
  'Pack Scale (9.000-15.000 EUR)',
  'Retainer Mensual (400-900 EUR/mes)',
  'Chatbot Atención Cliente',
  'Clasificador de Correos',
  'Bot Cualificación Leads',
  'Sistema Agendado Automático',
  'Automatización RRSS',
  'Automatización Documentos y Facturación',
  'Integración CRM + IA',
  'Automatización Marketing / Nurturing',
  'Base de Conocimiento RAG',
  'Agente de Voz IA',
  'Automatización a Medida',
  'Consultoría Estratégica (500 EUR)',
  'Landing Page Web (600-900 EUR)',
  'Web Corporativa (1.200-2.200 EUR)',
  'Web + Automatización básica',
]

export const FASES_PROCESO = [
  { value: '1_consultoria_gratuita', label: 'Consultoría gratuita' },
  { value: '2_consultoria_estrategica', label: 'Consultoría estratégica' },
  { value: '3_propuesta', label: 'Propuesta' },
  { value: '4_contrato', label: 'Contrato' },
]

export interface EstadoConfig {
  label: string
  bg: string
  color: string
}

export const ESTADOS_LEAD: Record<EstadoLead, EstadoConfig> = {
  prospecto:       { label: 'Prospecto',          bg: '#222222', color: '#888888' },
  contactado:      { label: 'Contactado',          bg: '#1A3A5C', color: '#4A9EFF' },
  reunion:         { label: 'Reunión agendada',    bg: '#2A1A4A', color: '#AA77FF' },
  propuesta:       { label: 'Propuesta enviada',   bg: '#3D2200', color: '#FF8C00' },
  negociacion:     { label: 'En negociación',      bg: '#3D3000', color: '#FFD700' },
  cerrado_ganado:  { label: 'Cerrado ganado',      bg: '#0D3320', color: '#00CC6A' },
  cerrado_perdido: { label: 'Cerrado perdido',     bg: '#3A0D0D', color: '#FF4444' },
  pausado:         { label: 'En pausa',            bg: '#222222', color: '#666666' },
}

export const ESTADOS_LEAD_ORDER: EstadoLead[] = [
  'prospecto',
  'contactado',
  'reunion',
  'propuesta',
  'negociacion',
  'cerrado_ganado',
  'cerrado_perdido',
  'pausado',
]

// Estados que cuentan como "pipeline activo" (leads con los que hay interacción real)
// Excluye: prospecto (pre-contacto), cerrado_ganado/perdido, pausado
export const ESTADOS_PIPELINE: EstadoLead[] = [
  'contactado',
  'reunion',
  'propuesta',
  'negociacion',
]

// Estados de leads activos (sin cerrar ni pausar)
export const ESTADOS_ACTIVOS: EstadoLead[] = [
  'prospecto',
  'contactado',
  'reunion',
  'propuesta',
  'negociacion',
]

export const ESTADOS_PROYECTO = {
  briefing:      { label: 'Briefing',       bg: '#1A1A3A', color: '#6677FF' },
  desarrollo:    { label: 'En desarrollo',  bg: '#0D2A1A', color: '#00CC6A' },
  revision:      { label: 'En revisión',    bg: '#3D3000', color: '#FFD700' },
  entregado:     { label: 'Entregado',      bg: '#003D3D', color: '#00E5FF' },
  mantenimiento: { label: 'Mantenimiento',  bg: '#1A2A1A', color: '#88CC88' },
  pausado:       { label: 'Pausado',        bg: '#222222', color: '#666666' },
  cancelado:     { label: 'Cancelado',      bg: '#3A0D0D', color: '#FF4444' },
} as const

export const ESTADOS_PROYECTO_ORDER = [
  'briefing',
  'desarrollo',
  'revision',
  'entregado',
  'mantenimiento',
  'pausado',
  'cancelado',
] as const

export type EstadoProyecto = keyof typeof ESTADOS_PROYECTO

export const TIPOS_PROYECTO = [
  'Web Corporativa',
  'Landing Page',
  'E-commerce',
  'Automatización',
  'Chatbot IA',
  'Integración CRM',
  'Consultoría',
  'Pack Starter',
  'Pack Growth',
  'Pack Scale',
  'Retainer',
  'Otro',
]

export const PRIORIDADES_PROYECTO = [
  { value: 'alta',  label: 'Alta',  color: '#FF4444' },
  { value: 'media', label: 'Media', color: '#FFD700' },
  { value: 'baja',  label: 'Baja',  color: '#888888' },
]

export const CATEGORIAS_TRANSACCION = [
  'Cobro proyecto',
  'Retainer mensual',
  'Suscripción SaaS',
  'Herramientas / Software',
  'Publicidad',
  'Freelance / Subcontrata',
  'Hosting / Infraestructura',
  'Formación',
  'Otros ingresos',
  'Otros gastos',
]

export const TIPOS_ACTIVIDAD = [
  { value: 'nota', label: 'Nota' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'reunion', label: 'Reunión' },
  { value: 'propuesta', label: 'Propuesta' },
]
