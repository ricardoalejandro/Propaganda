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

    // Obtener dispositivos conectados de difusion
    try {
      const devices = await difusion.listDevices()
      const isConnected = devices.some(
        d => d.device === account.deviceId || d.name === account.deviceId
      )
      const newStatus = isConnected ? 'CONNECTED' : 'DISCONNECTED'
      
      if (account.status !== newStatus && account.status !== 'SCANNING') {
        const updated = await prisma.whatsAppAccount.update({
          where: { id },
          data: {
            status: newStatus,
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
        ...(filial !== undefined && { filial }),
        ...(encargado !== undefined && { encargado }),
        ...(displayName !== undefined && { displayName }),
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

    // Logout en difusion si está conectado
    try {
      await difusion.logoutDevice(account.deviceId)
    } catch {
      // Ignorar errores
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
