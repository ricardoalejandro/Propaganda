import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as difusion from '@/lib/difusion'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/accounts/:id - Obtener cuenta específica
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

    // Obtener estado actualizado de difusion
    try {
      const status = await difusion.getDeviceStatus(account.deviceId)
      const newStatus = status.results.is_logged_in ? 'CONNECTED' : 'DISCONNECTED'
      
      if (account.status !== newStatus) {
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
      }
    } catch {
      // Ignorar errores de difusion
    }

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error fetching account:', error)
    return NextResponse.json(
      { error: 'Error al obtener la cuenta' },
      { status: 500 }
    )
  }
}

// PUT /api/accounts/:id - Actualizar cuenta
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { filial, encargado, displayName } = body

    const account = await prisma.whatsAppAccount.update({
      where: { id },
      data: {
        filial,
        encargado,
        displayName,
      },
    })

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la cuenta' },
      { status: 500 }
    )
  }
}

// DELETE /api/accounts/:id - Eliminar cuenta
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Eliminar de difusion
    try {
      await difusion.deleteDevice(account.deviceId)
    } catch {
      // Continuar aunque falle en difusion
    }

    // Eliminar de nuestra BD
    await prisma.whatsAppAccount.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la cuenta' },
      { status: 500 }
    )
  }
}
