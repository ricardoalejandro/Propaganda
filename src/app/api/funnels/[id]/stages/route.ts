import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/funnels/:id/stages - Crear nueva etapa
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: funnelId } = await params
    const body = await request.json()
    const { name, color, isWon, isLost } = body

    // Obtener última posición
    const lastStage = await prisma.funnelStage.findFirst({
      where: { funnelId },
      orderBy: { position: 'desc' },
    })
    const position = (lastStage?.position || 0) + 1

    const stage = await prisma.funnelStage.create({
      data: {
        funnelId,
        name,
        color: color || '#94a3b8',
        position,
        isWon: isWon || false,
        isLost: isLost || false,
      },
    })

    return NextResponse.json({ stage }, { status: 201 })
  } catch (error) {
    console.error('Error creating stage:', error)
    return NextResponse.json(
      { error: 'Error al crear la etapa' },
      { status: 500 }
    )
  }
}

// PUT /api/funnels/:id/stages - Reordenar etapas
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: funnelId } = await params
    const body = await request.json()
    const { stages } = body // Array de { id, position }

    // Actualizar posiciones en una transacción
    await prisma.$transaction(
      stages.map((stage: { id: string; position: number }) =>
        prisma.funnelStage.update({
          where: { id: stage.id },
          data: { position: stage.position },
        })
      )
    )

    // Retornar embudo actualizado
    const funnel = await prisma.funnel.findUnique({
      where: { id: funnelId },
      include: {
        stages: {
          orderBy: { position: 'asc' },
        },
      },
    })

    return NextResponse.json({ funnel })
  } catch (error) {
    console.error('Error reordering stages:', error)
    return NextResponse.json(
      { error: 'Error al reordenar las etapas' },
      { status: 500 }
    )
  }
}
