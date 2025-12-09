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
 * Detecta automaticamente se o valor está em decimal ou porcentagem:
 * - Se valor < 1: assume decimal e multiplica por 100 (0.2842 -> 28.42%)
 * - Se valor >= 1: assume porcentagem e apenas formata (28.42 -> 28.42%)
 * 
 * @param value - Valor em porcentagem (28.42) ou decimal (0.2842)
 * @param decimals - Número de casas decimais (padrão: 2)
 * @param fromDecimal - DEPRECATED: Se true, força multiplicação por 100 (mantido para compatibilidade)
 */
export function formatPercentSafe(value: number | null | undefined, decimals: number = 2, fromDecimal?: boolean): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%'
  }
  
  let finalValue = value
  
  // Se fromDecimal foi explicitamente passado como true, usar (compatibilidade)
  if (fromDecimal === true) {
    finalValue = value * 100
  } else {
    // Detecção automática: se valor < 1, assume decimal e multiplica por 100
    // Isso resolve tanto dados novos (decimais) quanto dados antigos (já em porcentagem)
    if (Math.abs(value) < 1 && value !== 0) {
      finalValue = value * 100
    }
  }
  
  return `${finalValue.toFixed(decimals)}%`
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
