import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as difusion from '@/lib/difusion'
import { parseJid } from '@/lib/utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/conversations/:id/messages - Enviar mensaje
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { content, type = 'text', mediaUrl, fileName, caption } = body

    if (!content && !mediaUrl) {
      return NextResponse.json(
        { error: 'Se requiere contenido o media' },
        { status: 400 }
      )
    }

    // Obtener la conversación con cuenta
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        account: true,
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      )
    }

    if (!conversation.account) {
      return NextResponse.json(
        { error: 'Cuenta no asociada' },
        { status: 400 }
      )
    }

    // Extraer número del JID
    const { phone } = parseJid(conversation.chatJid)
    
    let result: any
    const deviceId = conversation.account.deviceId

    // Enviar según tipo de mensaje
    switch (type) {
      case 'image':
        result = await difusion.sendImage(deviceId, phone, mediaUrl!, caption)
        break
      
      case 'document':
        result = await difusion.sendDocument(deviceId, phone, mediaUrl!, fileName, caption)
        break
      
      case 'audio':
        result = await difusion.sendAudio(deviceId, phone, mediaUrl!)
        break
      
      case 'video':
        result = await difusion.sendVideo(deviceId, phone, mediaUrl!, caption)
        break
      
      case 'location':
        const [lat, lng] = content.split(',').map(Number)
        result = await difusion.sendLocation(deviceId, phone, lat, lng)
        break
      
      default:
        result = await difusion.sendMessage(deviceId, phone, content)
    }

    // Guardar mensaje en BD
    const messageId = result.results?.message_id || `sent_${Date.now()}`
    const message = await prisma.message.create({
      data: {
        id: messageId,
        conversationId: id,
        body: content || caption || '[Media]',
        type: type,
        fromMe: true,
        hasMedia: !!mediaUrl,
        mediaUrl: mediaUrl || null,
        mediaType: type !== 'text' ? type : null,
        fileName: fileName || null,
        timestamp: new Date(),
      },
    })

    // Actualizar última actividad
    await prisma.conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
      },
    })

    return NextResponse.json({ message, sent: true })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Error al enviar el mensaje' },
      { status: 500 }
    )
  }
}

// GET /api/conversations/:id/messages - Obtener más mensajes (paginado)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '50')

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { timestamp: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    })

    const hasMore = messages.length > limit
    const items = hasMore ? messages.slice(0, -1) : messages

    return NextResponse.json({
      messages: items.reverse(),
      nextCursor: hasMore ? items[0].id : null,
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Error al obtener mensajes' },
      { status: 500 }
    )
  }
}
