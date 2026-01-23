import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as difusion from '@/lib/difusion'

// GET /api/accounts - Listar todas las cuentas
export async function GET() {
  try {
    // Obtener dispositivos conectados de difusion
    const difusionDevices = await difusion.listDevices()
    
    // Obtener cuentas de nuestra BD
    const accounts = await prisma.whatsAppAccount.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Actualizar estados basados en dispositivos de difusion
    const updatedAccounts = await Promise.all(
      accounts.map(async (account) => {
        // Buscar si el device está conectado en difusion
        const isConnected = difusionDevices.some(
          d => d.device === account.deviceId || d.name === account.deviceId
        )
        
        const newStatus = isConnected ? 'CONNECTED' : 'DISCONNECTED'
        
        if (account.status !== newStatus && account.status !== 'SCANNING') {
          return prisma.whatsAppAccount.update({
            where: { id: account.id },
            data: {
              status: newStatus,
              connectedAt: newStatus === 'CONNECTED' ? new Date() : account.connectedAt,
            },
          })
        }
        return account
      })
    )

    return NextResponse.json({ accounts: updatedAccounts })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { error: 'Error al obtener las cuentas' },
      { status: 500 }
    )
  }
}

// POST /api/accounts - Crear nueva cuenta y obtener QR
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceId, filial, encargado } = body

    if (!deviceId) {
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
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este ID' },
        { status: 400 }
      )
    }

    // Obtener QR de difusion (esto "crea" el device)
    const qrResult = await difusion.loginDevice(deviceId)

    // Guardar en nuestra BD
    const account = await prisma.whatsAppAccount.create({
      data: {
        deviceId,
        displayName: filial || deviceId,
        status: 'SCANNING',
        filial,
        encargado,
      },
    })

    return NextResponse.json({ 
      account,
      qr: {
        url: qrResult.qr_link,
        duration: qrResult.qr_duration,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json(
      { error: 'Error al crear la cuenta' },
      { status: 500 }
    )
  }
}
