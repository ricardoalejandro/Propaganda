import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as difusion from '@/lib/difusion'
import { connectionLogger } from '@/lib/logger'

// GET /api/accounts - Listar todas las cuentas
export async function GET() {
  const requestId = crypto.randomUUID()
  
  try {
    await connectionLogger.debug('accounts_list_start', `Iniciando listado de cuentas`, { requestId }, { requestId })

    // Obtener cuentas de nuestra BD
    const accounts = await prisma.whatsAppAccount.findMany({
      orderBy: { createdAt: 'desc' },
    })

    await connectionLogger.debug('accounts_found', `Cuentas encontradas en BD`, {
      count: accounts.length,
      accounts: accounts.map(a => ({ id: a.id, deviceId: a.deviceId, status: a.status })),
    }, { requestId })

    // Actualizar estados verificando cada dispositivo en difusion
    const updatedAccounts = await Promise.all(
      accounts.map(async (account) => {
        try {
          await connectionLogger.debug('account_status_check', `Verificando estado de cuenta`, {
            accountId: account.id,
            deviceId: account.deviceId,
            currentStatus: account.status,
          }, { accountId: account.id, requestId })

          // Verificar estado específico del dispositivo
          const status = await difusion.getDeviceStatus(account.deviceId)
          const isConnected = status.is_logged_in
          
          await connectionLogger.debug('account_status_result', `Resultado de verificación`, {
            accountId: account.id,
            deviceId: account.deviceId,
            is_connected: status.is_connected,
            is_logged_in: status.is_logged_in,
          }, { accountId: account.id, requestId })
          
          const newStatus = isConnected ? 'CONNECTED' : 'DISCONNECTED'
          
          // Actualizar si:
          // 1. El estado cambió Y no está en SCANNING, O
          // 2. Está en SCANNING y ya se conectó (is_logged_in = true)
          const shouldUpdate = 
            (account.status !== newStatus && account.status !== 'SCANNING') ||
            (account.status === 'SCANNING' && isConnected)
          
          if (shouldUpdate) {
            await connectionLogger.info('account_status_changed', `Actualizando estado de cuenta`, {
              accountId: account.id,
              deviceId: account.deviceId,
              oldStatus: account.status,
              newStatus,
              reason: account.status === 'SCANNING' ? 'QR escaneado exitosamente' : 'Estado cambió',
            }, { accountId: account.id, requestId })
            
            return prisma.whatsAppAccount.update({
              where: { id: account.id },
              data: {
                status: newStatus,
                connectedAt: newStatus === 'CONNECTED' ? new Date() : account.connectedAt,
              },
            })
          }
          return account
        } catch (err) {
          await connectionLogger.warn('account_status_check_failed', `Error al verificar estado`, {
            accountId: account.id,
            deviceId: account.deviceId,
            error: (err as Error).message,
          }, { accountId: account.id, requestId })
          // Si falla la verificación, devolver la cuenta sin cambios
          return account
        }
      })
    )

    await connectionLogger.info('accounts_list_success', `Listado completado`, {
      totalAccounts: updatedAccounts.length,
    }, { requestId })

    return NextResponse.json({ accounts: updatedAccounts })
  } catch (error) {
    await connectionLogger.error('accounts_list_error', `Error al listar cuentas`, error as Error, { requestId }, { requestId })
    return NextResponse.json(
      { error: 'Error al obtener las cuentas' },
      { status: 500 }
    )
  }
}

// POST /api/accounts - Crear nueva cuenta y obtener QR
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const body = await request.json()
    const { deviceId, filial, encargado } = body

    await connectionLogger.info('account_create_start', `Iniciando creación de cuenta`, {
      deviceId,
      filial,
      encargado,
      requestId,
    }, { requestId })

    if (!deviceId) {
      await connectionLogger.warn('account_create_validation', `deviceId no proporcionado`, {}, { requestId })
      return NextResponse.json(
        { error: 'El ID del dispositivo es requerido' },
        { status: 400 }
      )
    }

    // Verificar si ya existe
    const existing = await prisma.whatsAppAccount.findFirst({
      where: { deviceId },
    })

    if (existing) {
      await connectionLogger.warn('account_create_duplicate', `Ya existe cuenta con este deviceId`, {
        deviceId,
        existingId: existing.id,
      }, { requestId })
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este ID' },
        { status: 400 }
      )
    }

    await connectionLogger.info('account_create_qr_request', `Solicitando QR a difusion`, {
      deviceId,
      difusionUrl: process.env.DIFUSION_URL,
    }, { requestId })

    // Obtener QR de difusion (esto "crea" el device)
    let qrResult
    try {
      qrResult = await difusion.loginDevice(deviceId)
      
      await connectionLogger.info('account_create_qr_response', `Respuesta de difusion`, {
        deviceId,
        code: qrResult.code,
        message: qrResult.message,
        hasQrLink: !!qrResult.qr_link,
        qrDuration: qrResult.qr_duration,
      }, { requestId })
    } catch (qrError) {
      await connectionLogger.error('account_create_qr_error', `Error al obtener QR de difusion`, qrError as Error, {
        deviceId,
      }, { requestId })
      throw qrError
    }

    // Convertir HTTP a HTTPS para evitar contenido mixto
    let qrLink = qrResult.qr_link || ''
    if (qrLink.startsWith('http://')) {
      qrLink = qrLink.replace('http://', 'https://')
      await connectionLogger.debug('account_create_qr_https', `URL convertida a HTTPS`, {
        originalUrl: qrResult.qr_link,
        convertedUrl: qrLink,
      }, { requestId })
    }

    // Guardar en nuestra BD
    await connectionLogger.info('account_create_db', `Guardando cuenta en base de datos`, {
      deviceId,
      filial,
      encargado,
    }, { requestId })

    const account = await prisma.whatsAppAccount.create({
      data: {
        deviceId,
        displayName: filial || deviceId,
        status: 'SCANNING',
        filial,
        encargado,
      },
    })

    await connectionLogger.info('account_create_success', `Cuenta creada exitosamente`, {
      accountId: account.id,
      deviceId: account.deviceId,
      status: account.status,
    }, { accountId: account.id, requestId })

    return NextResponse.json({ 
      account,
      qr: {
        url: qrLink,
        duration: qrResult.qr_duration,
      }
    }, { status: 201 })
  } catch (error) {
    await connectionLogger.error('account_create_fatal', `Error fatal al crear cuenta`, error as Error, { requestId }, { requestId })
    return NextResponse.json(
      { error: 'Error al crear la cuenta', details: (error as Error).message },
      { status: 500 }
    )
  }
}

