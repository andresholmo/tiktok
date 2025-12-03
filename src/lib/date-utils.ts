/**
 * Utilitários de data para fuso horário do Brasil (America/Sao_Paulo)
 */

const TIMEZONE = 'America/Sao_Paulo'

/**
 * Retorna a data atual no Brasil no formato YYYY-MM-DD
 */
export function getTodayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE })
}

/**
 * Retorna a data/hora atual no Brasil
 */
export function getNowBR(): Date {
  const now = new Date()
  const brDateStr = now.toLocaleString('en-US', { timeZone: TIMEZONE })
  return new Date(brDateStr)
}

/**
 * Formata uma data para exibição no padrão brasileiro
 */
export function formatDateBR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date
  return d.toLocaleDateString('pt-BR', { timeZone: TIMEZONE })
}

/**
 * Formata data e hora para exibição no padrão brasileiro
 */
export function formatDateTimeBR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('pt-BR', { timeZone: TIMEZONE })
}

/**
 * Retorna a data/hora atual formatada para input datetime-local
 * Formato: YYYY-MM-DDTHH:MM
 */
export function getDateTimeLocalBR(): string {
  const now = new Date()
  const brDateStr = now.toLocaleString('sv-SE', { timeZone: TIMEZONE })
  // Formato sv-SE retorna YYYY-MM-DD HH:MM:SS, precisamos de YYYY-MM-DDTHH:MM
  return brDateStr.slice(0, 16).replace(' ', 'T')
}

/**
 * Converte uma data para o início do dia no fuso do Brasil
 */
export function startOfDayBR(date: string): string {
  return `${date}T00:00:00-03:00`
}

/**
 * Converte uma data para o fim do dia no fuso do Brasil
 */
export function endOfDayBR(date: string): string {
  return `${date}T23:59:59-03:00`
}

