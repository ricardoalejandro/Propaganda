import { difusionServer, DifusionResponse, ContactsResponse } from '@/lib/difusion'
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Try cache first
    const cached = await cacheGet<DifusionResponse<ContactsResponse>>(CACHE_KEYS.CONTACTS)
    if (cached) {
      console.log('[API/contacts] Cache HIT')
      return NextResponse.json(cached)
    }

    console.log('[API/contacts] Cache MISS - fetching from difusion')
    const response = await difusionServer.get<DifusionResponse<ContactsResponse>>('/user/my/contacts')

    // Store in cache (5 minutes - contacts are stable)
    await cacheSet(CACHE_KEYS.CONTACTS, response.data, CACHE_TTL.CONTACTS)

    return NextResponse.json(response.data)
  } catch (error: unknown) {
    console.error('Error getting contacts:', error)
    const err = error as { response?: { status?: number } }
    return NextResponse.json(
      { code: 'ERROR', message: 'Failed to get contacts', results: { data: [] } },
      { status: err.response?.status || 500 }
    )
  }
}
