import { difusionServer, DifusionResponse, MessagesResponse } from '@/lib/difusion'
import { cacheGet, cacheSet, CACHE_KEYS } from '@/lib/redis'
import { getMessagesWithCache, ensureDefaultConnection } from '@/lib/message-sync'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jid: string }> }
) {
  try {
    const { jid } = await params
    const decodedJid = decodeURIComponent(jid)

    // Get default connection ID
    const connectionId = await ensureDefaultConnection()

    // Get messages with PostgreSQL cache + sync
    const messages = await getMessagesWithCache(decodedJid, connectionId)

    // Update Redis cache as well (short term)
    // Note: getMessagesWithCache returns DifusionMessage[] directly
    const responseStructure = {
      code: 'SUCCESS',
      message: 'Messages retrieved',
      results: {
        data: messages,
        pagination: { limit: 100, offset: 0, total: messages.length },
        chat_info: {
          jid: decodedJid,
          name: decodedJid.split('@')[0], // Simplified
          last_message_time: new Date().toISOString(),
          ephemeral_expiration: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
    }

    // Debug logging
    console.log(`[Messages] JID: ${decodedJid}, Count: ${messages.length} (Source: PostgreSQL/Sync)`)

    return NextResponse.json(responseStructure)
  } catch (error: unknown) {
    console.error('Error getting messages:', error)
    const err = error as { response?: { status?: number } }
    return NextResponse.json(
      { code: 'ERROR', message: 'Failed to get messages', results: { data: [], pagination: {} } },
      { status: err.response?.status || 500 }
    )
  }
}
