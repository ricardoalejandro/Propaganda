import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/leads/:id - Obtener lead con detalles
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        stage: true,
        funnel: true,
        sourceAccount: {
          select: { phoneNumber: true, filial: true, displayName: true },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        tags: {
          include: { tag: true },
        },
        conversations: {
          include: {
            messages: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
          orderBy: { lastMessageAt: 'desc' },
        },
      },
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { error: 'Error al obtener el lead' },
      { status: 500 }
    )
  }
}

// PUT /api/leads/:id - Actualizar lead
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, value, currency, stageId, funnelId, position } = body

    const updateData: Record<string, unknown> = {}

    if (name !== undefined) updateData.name = name
    if (value !== undefined) updateData.value = value
    if (currency !== undefined) updateData.currency = currency

    // Si se mueve de etapa
    if (stageId !== undefined) {
      updateData.stageId = stageId
      
      // Si también se especifica posición
      if (position !== undefined) {
        updateData.position = position
      } else {
        // Calcular nueva posición al final de la etapa
        const lastLead = await prisma.lead.findFirst({
          where: { stageId },
          orderBy: { position: 'desc' },
        })
        updateData.position = (lastLead?.position || 0) + 1
      }
    }

    // Si se mueve de embudo
    if (funnelId !== undefined) {
      updateData.funnelId = funnelId
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        stage: true,
        funnel: true,
        sourceAccount: {
          select: { phoneNumber: true, filial: true },
        },
      },
    })

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el lead' },
      { status: 500 }
    )
  }
}

// DELETE /api/leads/:id - Eliminar lead
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    await prisma.lead.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el lead' },
      { status: 500 }
    )
  }
}
