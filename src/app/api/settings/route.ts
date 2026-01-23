import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { systemLogger, invalidateLogsCache } from '@/lib/logger'

// GET /api/settings - Obtener configuración
export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })

    // Crear configuración por defecto si no existe
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 'default',
          logsEnabled: true,
        }
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    )
  }
}

// PATCH /api/settings - Actualizar configuración
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { logsEnabled, companyName, defaultCurrency } = body

    // Asegurar que existe el registro
    await prisma.settings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    })

    const updateData: Record<string, unknown> = {}
    
    if (typeof logsEnabled === 'boolean') {
      updateData.logsEnabled = logsEnabled
      // Invalidar cache cuando se cambia
      invalidateLogsCache()
    }
    
    if (companyName !== undefined) {
      updateData.companyName = companyName
    }
    
    if (defaultCurrency !== undefined) {
      updateData.defaultCurrency = defaultCurrency
    }

    const settings = await prisma.settings.update({
      where: { id: 'default' },
      data: updateData,
    })

    await systemLogger.info('settings_updated', 'Configuración actualizada', updateData)

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    )
  }
}
