import { withDeviceId, DifusionResponse, ContactsResponse } from '@/lib/difusion'
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const deviceId = searchParams.get('device_id')
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

    // If connection_id provided, verify ownership and get device_id
    let actualDeviceId = deviceId

    if (connectionId && accountId) {
      const connection = await prisma.connection.findFirst({
        where: { id: connectionId, accountId }
      })
      if (connection?.deviceId) {
        actualDeviceId = connection.deviceId
      }
    } else if (accountId && !connectionId && !deviceId) {
      // No connection specified - find first available connection for this account
      const firstConnection = await prisma.connection.findFirst({
        where: { accountId, deviceId: { not: null } },
        orderBy: { createdAt: 'asc' }
      })
      if (firstConnection?.deviceId) {
        actualDeviceId = firstConnection.deviceId
      }
    }

    // Require device ID for contacts
    if (!actualDeviceId) {
      console.log('[API/contacts] No device ID available')
      return NextResponse.json({
        code: 'NO_DEVICE',
        message: 'No WhatsApp connection available',
        results: { data: [] }
      })
    }

    // Try cache first (scoped by device)
    const cacheKey = `${CACHE_KEYS.CONTACTS}:${actualDeviceId}`
    const cached = await cacheGet<DifusionResponse<ContactsResponse>>(cacheKey)
    if (cached) {
      console.log('[API/contacts] Cache HIT')
      return NextResponse.json(cached)
    }

    console.log('[API/contacts] Cache MISS - fetching from difusion with deviceId:', actualDeviceId)
    
    try {
      const client = withDeviceId(actualDeviceId)
      const response = await client.get<DifusionResponse<ContactsResponse>>('/user/my/contacts')

      // Store in cache (5 minutes - contacts are stable)
      await cacheSet(cacheKey, response.data, CACHE_TTL.CONTACTS)

      return NextResponse.json(response.data)
    } catch (difusionError: unknown) {
      const axiosErr = difusionError as { response?: { status?: number; data?: { message?: string } } }
      console.log('[API/contacts] Difusion error:', axiosErr.response?.status, axiosErr.response?.data?.message)
      
      // Return empty contacts gracefully instead of error
      return NextResponse.json({
        code: 'OFFLINE',
        message: axiosErr.response?.data?.message || 'Could not fetch contacts from WhatsApp',
        results: { data: [] },
        _offline: true
      })
    }
  } catch (error: unknown) {
    console.error('Error getting contacts:', error)
    return NextResponse.json(
      { code: 'ERROR', message: 'Failed to get contacts', results: { data: [] } },
      { status: 500 }
    )
  }
}
