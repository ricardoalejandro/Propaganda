import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/leads/:id/notes - Agregar nota
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: leadId } = await params
    const body = await request.json()
    const { content } = body

    const note = await prisma.leadNote.create({
      data: {
        leadId,
        content,
      },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { error: 'Error al crear la nota' },
      { status: 500 }
    )
  }
}

// GET /api/leads/:id/notes - Obtener notas
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: leadId } = await params

    const notes = await prisma.leadNote.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: 'Error al obtener las notas' },
      { status: 500 }
    )
  }
}
