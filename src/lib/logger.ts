/**
 * Sistema de Logging centralizado para Propaganda CRM
 * 
 * Características:
 * - Logs persistentes en base de datos
 * - Niveles: DEBUG, INFO, WARN, ERROR
 * - Categorías: connection, lead, message, api, webhook
 * - Puede activarse/desactivarse desde configuración
 */

import prisma from './prisma'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
export type LogCategory = 'connection' | 'lead' | 'message' | 'api' | 'webhook' | 'system'

interface LogContext {
  accountId?: string
  leadId?: string
  requestId?: string
  ip?: string
  userAgent?: string
}

interface LogOptions {
  action: string
  message: string
  details?: Record<string, unknown>
  error?: Error | string
  context?: LogContext
}

// Cache para el estado de logs (evitar consultas constantes)
let logsEnabledCache: boolean | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30000 // 30 segundos

async function isLoggingEnabled(): Promise<boolean> {
  const now = Date.now()
  
  // Si el cache es válido, usarlo
  if (logsEnabledCache !== null && (now - cacheTimestamp) < CACHE_TTL) {
    return logsEnabledCache
  }
  
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
      select: { logsEnabled: true }
    })
    logsEnabledCache = settings?.logsEnabled ?? true
    cacheTimestamp = now
    return logsEnabledCache
  } catch {
    // Si hay error, asumir que está habilitado
    return true
  }
}

// Invalidar cache cuando se cambie la configuración
export function invalidateLogsCache() {
  logsEnabledCache = null
}

class Logger {
  private category: LogCategory

  constructor(category: LogCategory) {
    this.category = category
  }

  private async log(level: LogLevel, options: LogOptions) {
    const { action, message, details, error, context } = options

    // Log a consola siempre (para debugging en tiempo real)
    const timestamp = new Date().toISOString()
    const logPrefix = `[${timestamp}] [${level}] [${this.category}] [${action}]`
    
    if (level === 'ERROR') {
      console.error(logPrefix, message, details || '', error || '')
    } else if (level === 'WARN') {
      console.warn(logPrefix, message, details || '')
    } else if (level === 'DEBUG') {
      console.log(logPrefix, message, details || '')
    } else {
      console.log(logPrefix, message, details || '')
    }

    // Verificar si logging a DB está habilitado
    const enabled = await isLoggingEnabled()
    if (!enabled) return

    try {
      await prisma.systemLog.create({
        data: {
          level,
          category: this.category,
          action,
          message,
          details: details ? JSON.parse(JSON.stringify(details)) : undefined,
          error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
          stack: error instanceof Error ? error.stack : undefined,
          accountId: context?.accountId,
          leadId: context?.leadId,
          requestId: context?.requestId,
          ip: context?.ip,
          userAgent: context?.userAgent,
        }
      })
    } catch (err) {
      // No fallar si no se puede guardar el log
      console.error('Failed to save log to database:', err)
    }
  }

  debug(action: string, message: string, details?: Record<string, unknown>, context?: LogContext) {
    return this.log('DEBUG', { action, message, details, context })
  }

  info(action: string, message: string, details?: Record<string, unknown>, context?: LogContext) {
    return this.log('INFO', { action, message, details, context })
  }

  warn(action: string, message: string, details?: Record<string, unknown>, context?: LogContext) {
    return this.log('WARN', { action, message, details, context })
  }

  error(action: string, message: string, error?: Error | string, details?: Record<string, unknown>, context?: LogContext) {
    return this.log('ERROR', { action, message, details, error, context })
  }
}

// Crear loggers por categoría
export const connectionLogger = new Logger('connection')
export const leadLogger = new Logger('lead')
export const messageLogger = new Logger('message')
export const apiLogger = new Logger('api')
export const webhookLogger = new Logger('webhook')
export const systemLogger = new Logger('system')

// Helper para crear un logger con requestId
export function createRequestLogger(category: LogCategory, requestId: string) {
  const logger = new Logger(category)
  return {
    debug: (action: string, message: string, details?: Record<string, unknown>, context?: LogContext) =>
      logger.debug(action, message, details, { ...context, requestId }),
    info: (action: string, message: string, details?: Record<string, unknown>, context?: LogContext) =>
      logger.info(action, message, details, { ...context, requestId }),
    warn: (action: string, message: string, details?: Record<string, unknown>, context?: LogContext) =>
      logger.warn(action, message, details, { ...context, requestId }),
    error: (action: string, message: string, error?: Error | string, details?: Record<string, unknown>, context?: LogContext) =>
      logger.error(action, message, error, details, { ...context, requestId }),
  }
}

export default Logger
