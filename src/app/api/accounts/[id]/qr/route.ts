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

    // Primero verificar estado actual del dispositivo
    const deviceStatus = await difusion.getDeviceStatus(account.deviceId)
    
    // Si ya está logueado, actualizar BD y retornar
    if (deviceStatus.is_logged_in) {
      await prisma.whatsAppAccount.update({
        where: { id },
        data: { 
          status: 'CONNECTED',
          connectedAt: account.connectedAt || new Date(),
        },
      })

      return NextResponse.json({
        status: 'CONNECTED',
        message: 'Dispositivo ya conectado',
        timestamp: Date.now(),
      })
    }

    // No está logueado, intentar obtener QR
    const qrResult = await difusion.loginDevice(account.deviceId)

    // Si responde ALREADY_LOGGED_IN (por caché), verificar de nuevo el status
    if (qrResult.code === 'ALREADY_LOGGED_IN') {
      await prisma.whatsAppAccount.update({
        where: { id },
        data: { 
          status: 'CONNECTED',
          connectedAt: account.connectedAt || new Date(),
        },
      })

      return NextResponse.json({
        status: 'CONNECTED',
        message: 'Dispositivo ya conectado',
        timestamp: Date.now(),
      })
    }

    // Actualizar estado a SCANNING
    await prisma.whatsAppAccount.update({
      where: { id },
      data: { status: 'SCANNING' },
    })

    // Convertir HTTP a HTTPS para evitar contenido mixto
    let qrLink = qrResult.qr_link || ''
    if (qrLink.startsWith('http://')) {
      qrLink = qrLink.replace('http://', 'https://')
    }

    return NextResponse.json({
      qrLink,
      duration: qrResult.qr_duration,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('Error getting QR:', error)
    return NextResponse.json(
      { error: 'Error al obtener el código QR' },
      { status: 500 }
    )
  }
}
