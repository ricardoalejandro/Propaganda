import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as difusion from '@/lib/difusion'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/accounts/:id/logout - Cerrar sesión de cuenta
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const account = await prisma.whatsAppAccount.findUnique({
      where: { id },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Cuenta no encontrada' },
        { status: 404 }
      )
    }

    // Logout en difusion
    await difusion.logoutDevice(account.deviceId)

    // Actualizar estado en BD
    const updated = await prisma.whatsAppAccount.update({
      where: { id },
      data: {
        status: 'DISCONNECTED',
      },
    })

    return NextResponse.json({ account: updated })
  } catch (error) {
    console.error('Error logging out account:', error)
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    )
  }
}
