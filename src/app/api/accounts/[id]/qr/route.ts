import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as difusion from '@/lib/difusion'
import { connectionLogger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/accounts/:id/qr - Obtener QR para escanear
export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = crypto.randomUUID()
  
  try {
    const { id } = await params
    
    await connectionLogger.info('qr_request_start', `Iniciando solicitud de QR`, {
      accountId: id,
      requestId,
    }, { accountId: id, requestId })

    const account = await prisma.whatsAppAccount.findUnique({
      where: { id },
    })

    if (!account) {
      await connectionLogger.warn('qr_account_not_found', `Cuenta no encontrada: ${id}`, {
        accountId: id,
      }, { accountId: id, requestId })
      
      return NextResponse.json(
        { error: 'Cuenta no encontrada' },
        { status: 404 }
      )
    }

    await connectionLogger.debug('qr_account_found', `Cuenta encontrada`, {
      accountId: id,
      deviceId: account.deviceId,
      currentStatus: account.status,
    }, { accountId: id, requestId })

    // Primero verificar estado actual del dispositivo
    await connectionLogger.info('qr_checking_status', `Verificando estado del dispositivo en difusion`, {
      deviceId: account.deviceId,
      difusionUrl: process.env.DIFUSION_URL,
    }, { accountId: id, requestId })

    let deviceStatus
    try {
      deviceStatus = await difusion.getDeviceStatus(account.deviceId)
      
      await connectionLogger.info('qr_status_response', `Respuesta de estado del dispositivo`, {
        deviceId: account.deviceId,
        device_id: deviceStatus.device_id,
        is_connected: deviceStatus.is_connected,
        is_logged_in: deviceStatus.is_logged_in,
      }, { accountId: id, requestId })
    } catch (statusError) {
      await connectionLogger.error('qr_status_error', `Error al verificar estado del dispositivo`, statusError as Error, {
        deviceId: account.deviceId,
      }, { accountId: id, requestId })
      throw statusError
    }
    
    // Si ya está logueado, actualizar BD y retornar
    if (deviceStatus.is_logged_in) {
      await connectionLogger.info('qr_already_connected', `Dispositivo ya está conectado, actualizando BD`, {
        deviceId: account.deviceId,
      }, { accountId: id, requestId })
      
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

    await connectionLogger.info('qr_requesting_login', `Dispositivo no está logueado, solicitando QR`, {
      deviceId: account.deviceId,
    }, { accountId: id, requestId })

    // No está logueado, intentar obtener QR
    let qrResult
    try {
      qrResult = await difusion.loginDevice(account.deviceId)
      
      await connectionLogger.info('qr_login_response', `Respuesta de login/QR`, {
        deviceId: account.deviceId,
        code: qrResult.code,
        message: qrResult.message,
        hasQrLink: !!qrResult.qr_link,
        qrDuration: qrResult.qr_duration,
      }, { accountId: id, requestId })
    } catch (loginError) {
      await connectionLogger.error('qr_login_error', `Error al solicitar QR de login`, loginError as Error, {
        deviceId: account.deviceId,
      }, { accountId: id, requestId })
      throw loginError
    }

    // Si responde ALREADY_LOGGED_IN (por caché), verificar de nuevo el status
    if (qrResult.code === 'ALREADY_LOGGED_IN') {
      await connectionLogger.info('qr_already_logged_in', `Difusion respondió ALREADY_LOGGED_IN`, {
        deviceId: account.deviceId,
      }, { accountId: id, requestId })
      
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
    
    await connectionLogger.info('qr_status_updated', `Estado actualizado a SCANNING`, {
      deviceId: account.deviceId,
    }, { accountId: id, requestId })

    // Convertir HTTP a HTTPS para evitar contenido mixto
    let qrLink = qrResult.qr_link || ''
    if (qrLink.startsWith('http://')) {
      qrLink = qrLink.replace('http://', 'https://')
      await connectionLogger.debug('qr_url_converted', `URL convertida de HTTP a HTTPS`, {
        originalUrl: qrResult.qr_link,
        convertedUrl: qrLink,
      }, { accountId: id, requestId })
    }

    await connectionLogger.info('qr_success', `QR generado exitosamente`, {
      deviceId: account.deviceId,
      qrLink,
      duration: qrResult.qr_duration,
    }, { accountId: id, requestId })

    return NextResponse.json({
      qrLink,
      duration: qrResult.qr_duration,
      timestamp: Date.now(),
    })
  } catch (error) {
    await connectionLogger.error('qr_fatal_error', `Error fatal al obtener QR`, error as Error, {
      requestId,
    }, { requestId })
    
    return NextResponse.json(
      { error: 'Error al obtener el código QR', details: (error as Error).message },
      { status: 500 }
    )
  }
}

