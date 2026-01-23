import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/leads - Listar leads
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const funnelId = searchParams.get('funnelId')
    const stageId = searchParams.get('stageId')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (funnelId) {
      where.funnelId = funnelId
    }

    if (stageId) {
      where.stageId = stageId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ]
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        stage: true,
        funnel: true,
        sourceAccount: {
          select: { phoneNumber: true, filial: true },
        },
        _count: {
          select: { notes: true, conversations: true },
        },
      },
      orderBy: [{ stageId: 'asc' }, { position: 'asc' }],
    })

    return NextResponse.json({ leads })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: 'Error al obtener los leads' },
      { status: 500 }
    )
  }
}

// POST /api/leads - Crear lead manualmente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, name, funnelId, stageId, value, sourceAccountId } = body

    // Validar que existe el embudo y la etapa
    const stage = await prisma.funnelStage.findUnique({
      where: { id: stageId },
    })

    if (!stage || stage.funnelId !== funnelId) {
      return NextResponse.json(
        { error: 'Etapa inválida' },
        { status: 400 }
      )
    }

    // Obtener última posición en la etapa
    const lastLead = await prisma.lead.findFirst({
      where: { stageId },
      orderBy: { position: 'desc' },
    })
    const position = (lastLead?.position || 0) + 1

    const lead = await prisma.lead.create({
      data: {
        phoneNumber,
        name,
        funnelId,
        stageId,
        position,
        value,
        sourceAccountId,
      },
      include: {
        stage: true,
        funnel: true,
        sourceAccount: {
          select: { phoneNumber: true, filial: true },
        },
      },
    })

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Error al crear el lead' },
      { status: 500 }
    )
  }
}
