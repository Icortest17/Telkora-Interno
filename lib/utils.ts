import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInMonths, format, isToday, isPast, addDays } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return format(new Date(dateStr), 'dd MMM yyyy', { locale: es })
}

export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM yyyy, HH:mm', { locale: es })
}

export function mesesComoCliente(fechaInicio: string | null): number {
  if (!fechaInicio) return 0
  return differenceInMonths(new Date(), new Date(fechaInicio))
}

export function isFollowupUrgente(fechaFollowup: string | null): boolean {
  if (!fechaFollowup) return false
  const date = new Date(fechaFollowup)
  return isToday(date) || isPast(date)
}

export function isFollowupProximo(fechaFollowup: string | null): boolean {
  if (!fechaFollowup) return false
  const date = new Date(fechaFollowup)
  const en3dias = addDays(new Date(), 3)
  return date <= en3dias && !isPast(date)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}
