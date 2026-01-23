import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as difusion from '@/lib/difusion'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/conversations/:id - Obtener conversación con mensajes
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        account: {
          select: { id: true, deviceId: true, phoneNumber: true, filial: true },
        },
        lead: {
          include: {
            stage: true,
            funnel: true,
            notes: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: limit,
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      )
    }

    // Marcar como leído
    if (conversation.unreadCount > 0) {
      await prisma.conversation.update({
        where: { id },
        data: { unreadCount: 0 },
      })
    }

    return NextResponse.json({
      conversation: {
        ...conversation,
        messages: conversation.messages.reverse(), // Orden cronológico
      },
    })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Error al obtener la conversación' },
      { status: 500 }
    )
  }
}
