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
          select: { id: true, deviceId: true, phoneNumber: true, filial: true },
        },
        lead: {
          select: { 
            id: true,
            name: true, 
            phoneNumber: true, 
            value: true,
            stage: { select: { name: true, color: true } },
            funnel: { select: { name: true } },
          },
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

// POST /api/conversations - Crear o obtener conversación para un lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId } = body

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId es requerido' },
        { status: 400 }
      )
    }

    // Obtener el lead con su cuenta de origen
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        sourceAccount: true,
      },
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead no encontrado' },
        { status: 404 }
      )
    }

    if (!lead.sourceAccount) {
      return NextResponse.json(
        { error: 'El lead no tiene una cuenta de WhatsApp asociada' },
        { status: 400 }
      )
    }

    // Crear JID del contacto (formato WhatsApp)
    const cleanPhone = lead.phoneNumber.replace(/\D/g, '')
    const chatJid = `${cleanPhone}@s.whatsapp.net`

    // Buscar conversación existente
    let conversation = await prisma.conversation.findFirst({
      where: {
        accountId: lead.sourceAccountId,
        leadId: lead.id,
      },
      include: {
        account: {
          select: { id: true, deviceId: true, phoneNumber: true, filial: true },
        },
        lead: {
          select: { 
            id: true,
            name: true, 
            phoneNumber: true, 
            value: true,
            stage: { select: { name: true, color: true } },
            funnel: { select: { name: true } },
          },
        },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    })

    // Si no existe, crear una nueva
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          chatJid,
          contactPhone: lead.phoneNumber,
          contactName: lead.name,
          accountId: lead.sourceAccountId,
          leadId: lead.id,
          lastMessageAt: new Date(),
        },
        include: {
          account: {
            select: { id: true, deviceId: true, phoneNumber: true, filial: true },
          },
          lead: {
            select: { 
              id: true,
              name: true, 
              phoneNumber: true, 
              value: true,
              stage: { select: { name: true, color: true } },
              funnel: { select: { name: true } },
            },
          },
          messages: {
            orderBy: { timestamp: 'desc' },
            take: 20,
          },
        },
      })
    }

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Error al crear la conversación' },
      { status: 500 }
    )
  }
}
