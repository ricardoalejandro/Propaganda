import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/webhook/difusion - Recibir mensajes desde Difusión
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    console.log(`[Webhook] === INCOMING ===`)
    console.log(`[Webhook] Body: ${body.substring(0, 500)}`)

    const payload = JSON.parse(body)
    
    // Difusión puede enviar varios formatos:
    // 1. Formato directo: { chat_id, from, message: {text, id}, pushname, timestamp }
    // 2. Formato con wrapper: { event, device_id, payload }
    
    let event = payload.event || 'message'
    let deviceId = payload.device_id
    let messageData = payload.payload || payload

    // Formato directo de Difusión v8
    if (payload.chat_id && payload.message) {
      event = 'message'
      deviceId = payload.device_id || extractDeviceFromJid(payload.from)
      
      messageData = {
        id: payload.message.id,
        chat_jid: formatJid(payload.chat_id),
        sender_jid: payload.from,
        sender_name: payload.pushname || payload.sender_id || payload.from?.split('@')[0],
        content: payload.message.text || payload.message.caption || '',
        timestamp: payload.timestamp,
        is_from_me: payload.is_from_me || false,
        media_type: payload.message.media_type,
        url: payload.message.url,
        filename: payload.message.filename,
        file_length: payload.message.file_length
      }
    }

    console.log(`[Webhook] Event: ${event}, Device: ${deviceId}`)

    // Buscar conexión por deviceId
    let connection = null
    
    if (deviceId) {
      connection = await prisma.connection.findFirst({
        where: { deviceId }
      })
    }

    // Si no se encuentra por deviceId, buscar la primera conexión activa
    if (!connection) {
      connection = await prisma.connection.findFirst({
        where: { isLoggedIn: true }
      })
      console.log(`[Webhook] Using first active connection: ${connection?.id}`)
    }

    if (!connection) {
      console.log(`[Webhook] No connection found, ignoring message`)
      return NextResponse.json({ received: true, processed: false })
    }

    // Procesar según tipo de evento
    switch (event) {
      case 'message':
        await handleIncomingMessage(connection.id, connection.accountId, messageData)
        break

      case 'message.ack':
        console.log(`[Webhook] Message ACK: ${JSON.stringify(messageData)}`)
        break

      case 'connection.update':
        await handleConnectionUpdate(connection.id, messageData)
        break

      default:
        console.log(`[Webhook] Unhandled event: ${event}`)
    }

    return NextResponse.json({ received: true, processed: true })
  } catch (error) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    )
  }
}

// Procesar mensaje entrante
async function handleIncomingMessage(
  connectionId: string,
  accountId: string,
  data: {
    id: string
    chat_jid: string
    sender_jid: string
    sender_name?: string
    content?: string
    timestamp: number | string
    is_from_me?: boolean
    media_type?: string
    url?: string
    filename?: string
    file_length?: number
  }
) {
  try {
    const chatJid = formatJid(data.chat_jid)
    const senderName = data.sender_name || chatJid.split('@')[0]
    const timestamp = typeof data.timestamp === 'number' 
      ? new Date(data.timestamp * 1000) 
      : new Date(data.timestamp)

    console.log(`[Webhook] Processing message: ${data.id} from ${chatJid}`)

    // Crear o actualizar chat
    const chat = await prisma.chat.upsert({
      where: {
        jid_connectionId: {
          jid: chatJid,
          connectionId
        }
      },
      update: {
        name: senderName,
        lastMessage: data.content?.substring(0, 100) || '[Media]',
        lastMsgTime: timestamp
      },
      create: {
        jid: chatJid,
        name: senderName,
        connectionId,
        lastMessage: data.content?.substring(0, 100) || '[Media]',
        lastMsgTime: timestamp
      }
    })

    // Crear mensaje (evitar duplicados)
    const existingMessage = await prisma.message.findFirst({
      where: { externalId: data.id, chatId: chat.id }
    })

    if (!existingMessage) {
      await prisma.message.create({
        data: {
          externalId: data.id,
          chatId: chat.id,
          senderJid: data.sender_jid,
          content: data.content || '',
          timestamp,
          isFromMe: data.is_from_me || false,
          mediaType: data.media_type || null,
          filename: data.filename || null,
          url: data.url || null,
          fileLength: data.file_length || null
        }
      })
      console.log(`[Webhook] Message saved: ${data.id}`)
    } else {
      console.log(`[Webhook] Message already exists: ${data.id}`)
    }

    // Crear o actualizar Lead automáticamente (solo para chats de personas, no grupos)
    if (!chatJid.includes('@g.us')) {
      try {
        await prisma.lead.upsert({
          where: {
            accountId_jid: {
              accountId,
              jid: chatJid
            }
          },
          update: {
            name: senderName,
            updatedAt: new Date()
          },
          create: {
            accountId,
            jid: chatJid,
            name: senderName,
            phone: chatJid.split('@')[0],
            stage: 'new'
          }
        })
      } catch (leadError) {
        console.error('[Webhook] Error creating lead:', leadError)
      }
    }

  } catch (error) {
    console.error('[Webhook] Error saving message:', error)
    throw error
  }
}

// Actualizar estado de conexión
async function handleConnectionUpdate(connectionId: string, data: { status?: string; is_logged_in?: boolean }) {
  try {
    await prisma.connection.update({
      where: { id: connectionId },
      data: {
        isConnected: data.status === 'connected' || data.is_logged_in === true,
        isLoggedIn: data.is_logged_in || false
      }
    })
    console.log(`[Webhook] Connection ${connectionId} updated: ${JSON.stringify(data)}`)
  } catch (error) {
    console.error('[Webhook] Error updating connection:', error)
  }
}

// Helpers
function formatJid(jid: string): string {
  if (!jid) return ''
  // Asegurar que tenga el sufijo correcto
  if (!jid.includes('@')) {
    return `${jid}@s.whatsapp.net`
  }
  return jid
}

function extractDeviceFromJid(jid: string): string | null {
  // El device_id podría estar en el JID del remitente
  if (!jid) return null
  return jid.split(':')[0]
}

// GET para verificar que el webhook está activo
export async function GET() {
  return NextResponse.json({ 
    status: 'active',
    endpoint: '/api/webhook/difusion',
    timestamp: new Date().toISOString()
  })
}
