import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { systemLogger, invalidateLogsCache } from '@/lib/logger'

// GET /api/logs - Obtener logs con filtros
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const level = searchParams.get('level')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}

    if (level && level !== 'ALL') {
      where.level = level
    }

    if (category && category !== 'ALL') {
      where.category = category
    }

    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { error: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.systemLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { error: 'Error al obtener logs' },
      { status: 500 }
    )
  }
}

// DELETE /api/logs - Eliminar logs
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const deleteAll = searchParams.get('all') === 'true'
    const olderThan = searchParams.get('olderThan') // días

    let deletedCount = 0

    if (deleteAll) {
      const result = await prisma.systemLog.deleteMany({})
      deletedCount = result.count
      await systemLogger.info('logs_cleared', `Se eliminaron todos los logs (${deletedCount} registros)`)
    } else if (olderThan) {
      const days = parseInt(olderThan)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const result = await prisma.systemLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate }
        }
      })
      deletedCount = result.count
      await systemLogger.info('logs_cleanup', `Se eliminaron logs de más de ${days} días (${deletedCount} registros)`)
    }

    return NextResponse.json({
      success: true,
      deletedCount,
    })
  } catch (error) {
    console.error('Error deleting logs:', error)
    return NextResponse.json(
      { error: 'Error al eliminar logs' },
      { status: 500 }
    )
  }
}
