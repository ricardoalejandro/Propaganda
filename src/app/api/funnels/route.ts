import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/funnels - Listar embudos
export async function GET() {
  try {
    const funnels = await prisma.funnel.findMany({
      include: {
        stages: {
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { leads: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { position: 'asc' }],
    })

    return NextResponse.json({ funnels })
  } catch (error) {
    console.error('Error fetching funnels:', error)
    return NextResponse.json(
      { error: 'Error al obtener los embudos' },
      { status: 500 }
    )
  }
}

// POST /api/funnels - Crear embudo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, color, stages } = body

    // Obtener última posición
    const lastFunnel = await prisma.funnel.findFirst({
      orderBy: { position: 'desc' },
    })
    const position = (lastFunnel?.position || 0) + 1

    const funnel = await prisma.funnel.create({
      data: {
        name,
        description,
        color: color || '#6366f1',
        position,
        stages: {
          create: stages || [
            { name: 'Nuevo', color: '#6366f1', position: 0 },
            { name: 'En proceso', color: '#f59e0b', position: 1 },
            { name: 'Cerrado', color: '#22c55e', position: 2, isWon: true },
          ],
        },
      },
      include: {
        stages: {
          orderBy: { position: 'asc' },
        },
      },
    })

    return NextResponse.json({ funnel }, { status: 201 })
  } catch (error) {
    console.error('Error creating funnel:', error)
    return NextResponse.json(
      { error: 'Error al crear el embudo' },
      { status: 500 }
    )
  }
}
