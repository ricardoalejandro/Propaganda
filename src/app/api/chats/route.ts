import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Chats SIEMPRE se leen de PostgreSQL - independiente de conexión a Difusión
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const connectionId = searchParams.get('connection_id')

    // Get authenticated user
    const session = await getSession()
    let accountId = session?.accountId || null
    
    // Handle stale tokens with null accountId
    if (session && !accountId) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { accountId: true }
      })
      accountId = user?.accountId || null
    }
    
    if (!accountId) {
      return NextResponse.json({
        code: 'UNAUTHORIZED',
        message: 'No account found',
        results: { data: [], pagination: { limit: 100, offset: 0, total: 0 } }
      }, { status: 401 })
    }

    console.log('[API/chats] Loading from PostgreSQL:', { accountId, connectionId })

    // Build query - filter by connection if specified, otherwise all account chats
    const whereClause = connectionId 
      ? { connectionId, connection: { accountId } }
      : { connection: { accountId } }

    const localChats = await prisma.chat.findMany({
      where: whereClause,
      orderBy: { lastMsgTime: 'desc' },
      include: {
        _count: { select: { messages: true } }
      },
      take: 100
    })

    console.log(`[API/chats] Found ${localChats.length} chats in PostgreSQL`)

    const chatsData = localChats.map(chat => ({
      jid: chat.jid,
      name: chat.name,
      last_message: chat.lastMessage,
      last_message_time: chat.lastMsgTime?.toISOString() || chat.updatedAt.toISOString(),
      message_count: chat._count.messages,
      ephemeral_expiration: 0,
      created_at: chat.createdAt.toISOString(),
      updated_at: chat.updatedAt.toISOString()
    }))

    return NextResponse.json({
      code: 'SUCCESS',
      message: 'Chats retrieved',
      results: {
        data: chatsData,
        pagination: { limit: 100, offset: 0, total: chatsData.length }
      }
    })
  } catch (error: unknown) {
    console.error('Error getting chats:', error)
    return NextResponse.json(
      { code: 'ERROR', message: 'Failed to get chats', results: { data: [], pagination: {} } },
      { status: 500 }
    )
  }
}


