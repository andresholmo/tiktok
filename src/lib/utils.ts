import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value ?? 0)
}

export function formatPercent(value: number | null | undefined): string {
  return `${(value ?? 0).toFixed(2)}%`
}

/**
 * Formata número com casas decimais de forma segura
 * Retorna "0.00" se o valor for null/undefined
 */
export function safeToFixed(value: number | null | undefined, decimals: number = 2): string {
  return (value ?? 0).toFixed(decimals)
}

/**
 * Formata moeda BRL de forma segura
 */
export function formatCurrencyBRL(value: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value ?? 0)
}

/**
 * Formata porcentagem de forma segura
 */
export function formatPercentSafe(value: number | null | undefined, decimals: number = 2): string {
  return `${(value ?? 0).toFixed(decimals)}%`
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}
