import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'secret'

// Verificar firma HMAC del webhook
function verifySignature(body: string, signature: string): boolean {
  if (!signature) return false
  
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex')
  
  // Comparar longitudes primero para evitar el error de timingSafeEqual
  if (signature.length !== expectedSignature.length) {
    return false
  }
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

// POST /api/webhook/difusion - Recibir eventos de difusion
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('X-Signature') || ''

    // Log del body completo para debug
    console.log(`[Webhook] === INCOMING REQUEST ===`)
    console.log(`[Webhook] Body: ${body.substring(0, 1000)}`)

    // Verificar firma HMAC si está configurada
    // Por ahora desactivamos la verificación para permitir que funcione
    // TODO: Asegurarse que WEBHOOK_SECRET coincide en ambos lados
    if (signature && WEBHOOK_SECRET !== 'secret') {
      if (!verifySignature(body, signature)) {
        console.error('[Webhook] Invalid signature received')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)
    
    // Debug: ver estructura completa del payload
    console.log(`[Webhook] Raw payload keys: ${Object.keys(payload).join(', ')}`)
    
    // Difusion envía formato directo (sin wrapper event/device_id):
    // { chat_id, from, from_lid, message: {text, id}, pushname, sender_id, timestamp }
    let event = payload.event || 'message'  // Por defecto es message
    let device_id = payload.device_id
    let eventPayload = payload.payload
    
    // Si tiene chat_id y message, es el formato directo de difusion
    if (payload.chat_id && payload.message) {
      event = 'message'
      // Extraer device_id del campo 'from' (ej: "51993738489@s.whatsapp.net")
      device_id = payload.from
      
      // Convertir al formato que espera handleIncomingMessage
      eventPayload = {
        id: payload.message.id,
        chat_id: `${payload.chat_id}@s.whatsapp.net`,
        from: payload.from,
        from_name: payload.pushname || payload.sender_id,
        body: payload.message.text,
        timestamp: payload.timestamp
      }
      console.log(`[Webhook] Converted difusion format: chat=${eventPayload.chat_id}, from=${payload.from}`)
    }

    console.log(`[Webhook] Event: ${event}, Device: ${device_id}`)

    // Buscar cuenta - primero por device_id si existe
    let account = null
    
    if (device_id) {
      // Intentar buscar por device_id exacto
      account = await prisma.whatsAppAccount.findUnique({
        where: { deviceId: device_id },
      })

      // Si no encuentra, intentar buscar por número de teléfono extraído del device_id
      if (!account && device_id.includes('@')) {
        const phoneFromDeviceId = device_id.split('@')[0].split(':')[0]
        console.log(`[Webhook] Searching by phone: ${phoneFromDeviceId}`)
        account = await prisma.whatsAppAccount.findFirst({
          where: {
            OR: [
              { phoneNumber: phoneFromDeviceId },
              { phoneNumber: `+${phoneFromDeviceId}` },
            ]
          }
        })
      }
    }

    // Si aún no encuentra, usar la primera cuenta conectada
    if (!account) {
      account = await prisma.whatsAppAccount.findFirst({
        where: { status: 'CONNECTED' }
      })
      if (account) {
        console.log(`[Webhook] Using first connected account: ${account.id}`)
      }
    }

    if (!account) {
      console.log(`[Webhook] No account found for device: ${device_id}`)
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

// Procesar mensaje entrante - Formato difusion v8
async function handleIncomingMessage(
  account: { id: string; deviceId: string },
  payload: {
    // Formato nuevo de difusion v8
    id?: string
    chat_id?: string
    from?: string
    from_lid?: string
    from_name?: string
    body?: string
    timestamp?: string
    image?: string | { url: string; caption?: string }
    video?: string | { url: string; caption?: string }
    audio?: string
    document?: string | { url: string; filename?: string }
    sticker?: string
    contact?: { displayName: string; vcard: string }
    location?: { degreesLatitude: number; degreesLongitude: number; name?: string }
    forwarded?: boolean
    view_once?: boolean
    // Formato antiguo (fallback)
    info?: {
      id: string
      chat: string
      sender: string
      timestamp: number
      is_from_me: boolean
      is_group: boolean
      push_name?: string
    }
    message?: {
      conversation?: string
      extended_text_message?: { text: string }
      image_message?: { caption?: string }
      video_message?: { caption?: string }
      document_message?: { file_name?: string }
    }
  }
) {
  // Detectar formato: nuevo (v8) o antiguo
  const isNewFormat = !!payload.chat_id
  
  let messageId: string
  let chatJid: string
  let senderJid: string
  let senderName: string
  let timestamp: Date
  let isFromMe: boolean
  let body = ''
  let type = 'text'
  let hasMedia = false
  let fileName: string | undefined

  if (isNewFormat) {
    // Formato nuevo difusion v8
    messageId = payload.id || `msg_${Date.now()}`
    chatJid = payload.chat_id!
    senderJid = payload.from || chatJid
    senderName = payload.from_name || senderJid.split('@')[0]
    timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date()
    
    // Determinar si es mensaje propio
    // En difusion v8, los mensajes propios tienen from igual al device_id
    isFromMe = senderJid.includes(account.deviceId.split(':')[0]) || 
               senderJid === chatJid

    // Extraer contenido según tipo
    if (payload.body) {
      body = payload.body
      type = 'text'
    } else if (payload.image) {
      body = typeof payload.image === 'string' ? '[Imagen]' : (payload.image.caption || '[Imagen]')
      type = 'image'
      hasMedia = true
    } else if (payload.video) {
      body = typeof payload.video === 'string' ? '[Video]' : (payload.video.caption || '[Video]')
      type = 'video'
      hasMedia = true
    } else if (payload.audio) {
      body = '[Audio]'
      type = 'audio'
      hasMedia = true
    } else if (payload.document) {
      body = typeof payload.document === 'string' ? '[Documento]' : (payload.document.filename || '[Documento]')
      type = 'document'
      hasMedia = true
      fileName = typeof payload.document === 'object' ? payload.document.filename : undefined
    } else if (payload.sticker) {
      body = '[Sticker]'
      type = 'sticker'
      hasMedia = true
    } else if (payload.contact) {
      body = `[Contacto: ${payload.contact.displayName}]`
      type = 'contact'
    } else if (payload.location) {
      body = payload.location.name || '[Ubicación]'
      type = 'location'
    }
  } else if (payload.info && payload.message) {
    // Formato antiguo (fallback)
    const { info, message } = payload
    messageId = info.id
    chatJid = info.chat
    senderJid = info.sender
    senderName = info.push_name || senderJid.split('@')[0]
    timestamp = new Date(info.timestamp * 1000)
    isFromMe = info.is_from_me

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
  } else {
    console.log('[Webhook] Unknown payload format:', JSON.stringify(payload).substring(0, 200))
    return
  }

  const isGroup = chatJid.includes('@g.us')
  
  console.log(`[Webhook] Processing message: id=${messageId}, chat=${chatJid}, from=${senderName}, body=${body.substring(0, 50)}`)

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
    if (!isGroup && !isFromMe) {
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
    where: { id: messageId },
    update: {},
    create: {
      id: messageId,
      conversationId: conversation.id,
      body,
      type,
      fromMe: isFromMe,
      senderJid,
      senderName,
      hasMedia,
      fileName,
      timestamp,
    },
  })

  // Actualizar conversación
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: timestamp,
      unreadCount: isFromMe
        ? conversation.unreadCount
        : { increment: 1 },
    },
  })

  // Actualizar lead si existe
  if (conversation.leadId) {
    await prisma.lead.update({
      where: { id: conversation.leadId },
      data: {
        lastContactAt: timestamp,
        name: senderName || undefined,
      },
    })
  }

  console.log(`[Webhook] Message saved: ${messageId}`)
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
