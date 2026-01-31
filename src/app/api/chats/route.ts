import { difusionServer, DifusionResponse, ChatListResponse } from '@/lib/difusion'
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Try cache first
    const cached = await cacheGet<DifusionResponse<ChatListResponse>>(CACHE_KEYS.CHATS)
    if (cached) {
      console.log('[API/chats] Cache HIT')
      return NextResponse.json(cached)
    }

    console.log('[API/chats] Cache MISS - fetching from difusion')
    const response = await difusionServer.get<DifusionResponse<ChatListResponse>>('/chats?limit=100')

    // Store in cache
    await cacheSet(CACHE_KEYS.CHATS, response.data, CACHE_TTL.CHATS)

    return NextResponse.json(response.data)
  } catch (error: unknown) {
    console.error('Error getting chats:', error)
    const err = error as { response?: { status?: number } }
    return NextResponse.json(
      { code: 'ERROR', message: 'Failed to get chats', results: { data: [], pagination: {} } },
      { status: err.response?.status || 500 }
    )
  }
}
