import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as difusion from '@/lib/difusion'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/accounts/:id/reconnect - Reconectar cuenta
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

    // Reconectar en difusion
    await difusion.reconnectDevice(account.deviceId)

    // Obtener nuevo estado
    const status = await difusion.getDeviceStatus(account.deviceId)
    const newStatus = status.results.is_logged_in ? 'CONNECTED' : 'DISCONNECTED'

    // Actualizar en BD
    const updated = await prisma.whatsAppAccount.update({
      where: { id },
      data: {
        status: newStatus,
        phoneNumber: status.results.phone_number || account.phoneNumber,
        displayName: status.results.push_name || account.displayName,
        connectedAt: newStatus === 'CONNECTED' ? new Date() : account.connectedAt,
      },
    })

    return NextResponse.json({ account: updated })
  } catch (error) {
    console.error('Error reconnecting account:', error)
    return NextResponse.json(
      { error: 'Error al reconectar la cuenta' },
      { status: 500 }
    )
  }
}
