import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'secret'

// Verificar firma HMAC del webhook
function verifySignature(body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

// POST /api/webhook/difusion - Recibir eventos de difusion
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('X-Signature') || ''

    // Verificar firma (opcional en desarrollo)
    if (process.env.NODE_ENV === 'production') {
      if (!verifySignature(body, signature)) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)
    const { event, device_id, payload: eventPayload } = payload

    console.log(`[Webhook] Event: ${event}, Device: ${device_id}`)

    // Buscar cuenta por device_id
    const account = await prisma.whatsAppAccount.findUnique({
      where: { deviceId: device_id },
    })

    if (!account) {
      console.log(`[Webhook] Account not found for device: ${device_id}`)
      return NextResponse.json({ received: true })
    }

    // Procesar según tipo de evento
    switch (event) {
      case 'message':
        await handleIncomingMessage(account, eventPayload)
        break

      case 'message.ack':
        await handleMessageAck(eventPayload)
        break

      case 'connection.update':
        await handleConnectionUpdate(account, eventPayload)
        break

      default:
        console.log(`[Webhook] Unhandled event: ${event}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Webhook] Error processing:', error)
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    )
  }
}

// Procesar mensaje entrante
async function handleIncomingMessage(
  account: { id: string; deviceId: string },
  payload: {
    info: {
      id: string
      chat: string
      sender: string
      timestamp: number
      is_from_me: boolean
      is_group: boolean
      push_name?: string
    }
    message: {
      conversation?: string
      extended_text_message?: { text: string }
      image_message?: { caption?: string }
      video_message?: { caption?: string }
      document_message?: { file_name?: string }
    }
  }
) {
  const { info, message } = payload
  const chatJid = info.chat
  const isGroup = chatJid.includes('@g.us')
  const senderJid = info.sender
  const senderName = info.push_name || senderJid.split('@')[0]

  // Extraer contenido del mensaje
  let body = ''
  let type = 'text'
  let hasMedia = false
  let fileName: string | undefined

  if (message.conversation) {
    body = message.conversation
  } else if (message.extended_text_message?.text) {
    body = message.extended_text_message.text
  } else if (message.image_message) {
    body = message.image_message.caption || '[Imagen]'
    type = 'image'
    hasMedia = true
  } else if (message.video_message) {
    body = message.video_message.caption || '[Video]'
    type = 'video'
    hasMedia = true
  } else if (message.document_message) {
    body = message.document_message.file_name || '[Documento]'
    type = 'document'
    hasMedia = true
    fileName = message.document_message.file_name
  }

  // Buscar o crear conversación
  let conversation = await prisma.conversation.findUnique({
    where: {
      accountId_chatJid: {
        accountId: account.id,
        chatJid,
      },
    },
    include: { lead: true },
  })

  if (!conversation) {
    // Buscar embudo por defecto
    let defaultFunnel = await prisma.funnel.findFirst({
      where: { isDefault: true },
      include: { stages: { orderBy: { position: 'asc' } } },
    })

    // Si no existe, crear embudo por defecto
    if (!defaultFunnel) {
      defaultFunnel = await prisma.funnel.create({
        data: {
          name: 'Leads',
          isDefault: true,
          stages: {
            create: [
              { name: 'Nuevo', color: '#6366f1', position: 0 },
              { name: 'Contactado', color: '#f59e0b', position: 1 },
              { name: 'Calificado', color: '#22c55e', position: 2 },
              { name: 'Propuesta', color: '#3b82f6', position: 3 },
              { name: 'Ganado', color: '#10b981', position: 4, isWon: true },
              { name: 'Perdido', color: '#ef4444', position: 5, isLost: true },
            ],
          },
        },
        include: { stages: { orderBy: { position: 'asc' } } },
      })
    }

    const firstStage = defaultFunnel.stages[0]

    // Solo crear lead si no es grupo y no es mensaje propio
    if (!isGroup && !info.is_from_me) {
      const phoneNumber = senderJid.split('@')[0]
      
      // Buscar o crear lead
      let lead = await prisma.lead.findUnique({
        where: {
          phoneNumber_funnelId: {
            phoneNumber,
            funnelId: defaultFunnel.id,
          },
        },
      })

      if (!lead) {
        lead = await prisma.lead.create({
          data: {
            phoneNumber,
            name: senderName,
            funnelId: defaultFunnel.id,
            stageId: firstStage.id,
            sourceAccountId: account.id,
          },
        })
      }

      conversation = await prisma.conversation.create({
        data: {
          accountId: account.id,
          chatJid,
          isGroup,
          leadId: lead.id,
        },
        include: { lead: true },
      })
    } else {
      conversation = await prisma.conversation.create({
        data: {
          accountId: account.id,
          chatJid,
          isGroup,
        },
        include: { lead: true },
      })
    }
  }

  // Crear mensaje
  await prisma.message.upsert({
    where: { id: info.id },
    update: {},
    create: {
      id: info.id,
      conversationId: conversation.id,
      body,
      type,
      fromMe: info.is_from_me,
      senderJid,
      senderName,
      hasMedia,
      fileName,
      timestamp: new Date(info.timestamp * 1000),
    },
  })

  // Actualizar conversación
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(info.timestamp * 1000),
      unreadCount: info.is_from_me
        ? conversation.unreadCount
        : { increment: 1 },
    },
  })

  // Actualizar lead si existe
  if (conversation.leadId) {
    await prisma.lead.update({
      where: { id: conversation.leadId },
      data: {
        lastContactAt: new Date(info.timestamp * 1000),
        name: senderName || undefined,
      },
    })
  }

  console.log(`[Webhook] Message saved: ${info.id}`)
}

// Procesar ACK de mensaje
async function handleMessageAck(payload: {
  id: string
  ack: number // 1=enviado, 2=recibido, 3=leído
}) {
  console.log(`[Webhook] Message ACK: ${payload.id} -> ${payload.ack}`)
  // Podríamos actualizar estado del mensaje si lo necesitamos
}

// Procesar cambio de conexión
async function handleConnectionUpdate(
  account: { id: string },
  payload: {
    is_logged_in: boolean
    phone_number?: string
    push_name?: string
  }
) {
  await prisma.whatsAppAccount.update({
    where: { id: account.id },
    data: {
      status: payload.is_logged_in ? 'CONNECTED' : 'DISCONNECTED',
      phoneNumber: payload.phone_number,
      displayName: payload.push_name,
      connectedAt: payload.is_logged_in ? new Date() : undefined,
    },
  })

  console.log(`[Webhook] Connection update: ${account.id} -> ${payload.is_logged_in}`)
}
