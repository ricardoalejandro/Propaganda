import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/funnels/:id - Obtener embudo con leads
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const funnel = await prisma.funnel.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: {
            leads: {
              orderBy: { position: 'asc' },
              include: {
                sourceAccount: {
                  select: { phoneNumber: true, filial: true },
                },
              },
            },
          },
        },
      },
    })

    if (!funnel) {
      return NextResponse.json(
        { error: 'Embudo no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ funnel })
  } catch (error) {
    console.error('Error fetching funnel:', error)
    return NextResponse.json(
      { error: 'Error al obtener el embudo' },
      { status: 500 }
    )
  }
}

// PUT /api/funnels/:id - Actualizar embudo
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, color } = body

    const funnel = await prisma.funnel.update({
      where: { id },
      data: { name, description, color },
      include: {
        stages: {
          orderBy: { position: 'asc' },
        },
      },
    })

    return NextResponse.json({ funnel })
  } catch (error) {
    console.error('Error updating funnel:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el embudo' },
      { status: 500 }
    )
  }
}

// DELETE /api/funnels/:id - Eliminar embudo
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const funnel = await prisma.funnel.findUnique({
      where: { id },
    })

    if (!funnel) {
      return NextResponse.json(
        { error: 'Embudo no encontrado' },
        { status: 404 }
      )
    }

    if (funnel.isDefault) {
      return NextResponse.json(
        { error: 'No se puede eliminar el embudo principal' },
        { status: 400 }
      )
    }

    await prisma.funnel.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting funnel:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el embudo' },
      { status: 500 }
    )
  }
}
