import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatear número de teléfono
 */
export function formatPhoneNumber(phone: string): string {
  // Remove @s.whatsapp.net suffix if present
  const cleanPhone = phone.replace(/@s\.whatsapp\.net$/, '')
  
  // Add + prefix if not present
  if (!cleanPhone.startsWith('+')) {
    return `+${cleanPhone}`
  }
  return cleanPhone
}

/**
 * Parsear JID de WhatsApp
 */
export function parseJid(jid: string): { phone: string; isGroup: boolean } {
  const isGroup = jid.includes('@g.us')
  const phone = jid.split('@')[0]
  return { phone, isGroup }
}

/**
 * Formatear fecha relativa
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

/**
 * Formatear valor monetario
 */
export function formatCurrency(value: number, currency = 'PEN'): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Generar iniciales de nombre
 */
export function getInitials(name: string): string {
  if (!name) return '?'
  const words = name.trim().split(' ')
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase()
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

/**
 * Truncar texto
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Generar color basado en string
 */
export function stringToColor(str: string): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
  ]
  
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Formatear hora de un mensaje
 */
export function formatTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}
