import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as difusion from '@/lib/difusion'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/accounts/:id/qr - Obtener QR para escanear
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Actualizar estado a SCANNING
    await prisma.whatsAppAccount.update({
      where: { id },
      data: { status: 'SCANNING' },
    })

    // Obtener QR de difusion usando loginDevice
    const qrResult = await difusion.loginDevice(account.deviceId)

    // Convertir HTTP a HTTPS para evitar contenido mixto
    let qrLink = qrResult.qr_link || ''
    if (qrLink.startsWith('http://')) {
      qrLink = qrLink.replace('http://', 'https://')
    }

    return NextResponse.json({
      qrLink,
      duration: qrResult.qr_duration,
      timestamp: Date.now(), // Para forzar actualización en el cliente
    })
  } catch (error) {
    console.error('Error getting QR:', error)
    return NextResponse.json(
      { error: 'Error al obtener el código QR' },
      { status: 500 }
    )
  }
}
