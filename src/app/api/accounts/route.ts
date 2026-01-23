import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as difusion from '@/lib/difusion'

// GET /api/accounts - Listar todas las cuentas
export async function GET() {
  try {
    const accounts = await prisma.whatsAppAccount.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Actualizar estados desde difusion
    const updatedAccounts = await Promise.all(
      accounts.map(async (account) => {
        try {
          const status = await difusion.getDeviceStatus(account.deviceId)
          const newStatus = status.results.is_logged_in ? 'CONNECTED' : 'DISCONNECTED'
          
          if (account.status !== newStatus) {
            return prisma.whatsAppAccount.update({
              where: { id: account.id },
              data: {
                status: newStatus,
                phoneNumber: status.results.phone_number || account.phoneNumber,
                displayName: status.results.push_name || account.displayName,
                connectedAt: newStatus === 'CONNECTED' ? new Date() : account.connectedAt,
              },
            })
          }
          return account
        } catch {
          // Si falla, mantener el estado actual
          return account
        }
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

// POST /api/accounts - Crear nueva cuenta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filial, encargado } = body

    // Crear device en difusion
    const device = await difusion.addDevice(filial || 'Nueva cuenta')

    // Guardar en nuestra BD
    const account = await prisma.whatsAppAccount.create({
      data: {
        deviceId: device.device_id,
        displayName: device.display_name,
        status: 'SCANNING',
        filial,
        encargado,
      },
    })

    return NextResponse.json({ account }, { status: 201 })
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json(
      { error: 'Error al crear la cuenta' },
      { status: 500 }
    )
  }
}
