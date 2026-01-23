import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/conversations - Listar conversaciones
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('accountId')
    const leadId = searchParams.get('leadId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const where: Record<string, unknown> = {}

    if (accountId) {
      where.accountId = accountId
    }

    if (leadId) {
      where.leadId = leadId
    }

    if (unreadOnly) {
      where.unreadCount = { gt: 0 }
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        account: {
          select: { phoneNumber: true, filial: true },
        },
        lead: {
          select: { name: true, phoneNumber: true, stage: true },
        },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Error al obtener las conversaciones' },
      { status: 500 }
    )
  }
}
