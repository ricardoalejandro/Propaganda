import { DevicesAPI } from '@/lib/difusion'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Helper to get accountId (handles stale tokens with null accountId)
async function getAccountId(session: { userId: string; accountId: string | null }): Promise<string | null> {
  if (session.accountId) return session.accountId
  
  // Fallback: lookup from database if token has null accountId
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { accountId: true }
  })
  return user?.accountId || null
}

// GET /api/devices/[id]/status - Get device status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated', results: null },
        { status: 401 }
      )
    }

    const accountId = await getAccountId(session)
    if (!accountId) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'No account associated', results: null },
        { status: 401 }
      )
    }

    // Verify device belongs to user
    const connection = await prisma.connection.findFirst({
      where: { id, accountId }
    })

    if (!connection) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Device not found', results: null },
        { status: 404 }
      )
    }

    // Try to get status from Difusión
    if (connection.deviceId) {
      try {
        const statusResult = await DevicesAPI.status(connection.deviceId)
        
        const isConnected = statusResult.results?.is_connected || false
        const isLoggedIn = statusResult.results?.is_logged_in || false
        const jid = statusResult.results?.jid || null
        
        // Update DB if status changed
        if (isConnected !== connection.isConnected || isLoggedIn !== connection.isLoggedIn) {
          await prisma.connection.update({
            where: { id },
            data: { isConnected, isLoggedIn }
          })
        }
        
        return NextResponse.json({
          code: 'SUCCESS',
          message: 'Status retrieved',
          results: {
            isConnected,
            isLoggedIn,
            jid,
            displayName: statusResult.results?.display_name || connection.name
          }
        })
      } catch (e) {
        console.log('Could not get difusion status:', e)
      }
    }

    // Fallback to DB status
    return NextResponse.json({
      code: 'SUCCESS',
      message: 'Status from local cache',
      results: {
        isConnected: connection.isConnected,
        isLoggedIn: connection.isLoggedIn,
        jid: null,
        displayName: connection.name
      },
      _offline: true
    })
  } catch (error: unknown) {
    console.error('Error getting device status:', error)
    return NextResponse.json(
      { code: 'ERROR', message: 'Failed to get status', results: null },
      { status: 500 }
    )
  }
}

// POST /api/devices/[id]/status - Reconnect device
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated', results: null },
        { status: 401 }
      )
    }

    const accountId = await getAccountId(session)
    if (!accountId) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'No account associated', results: null },
        { status: 401 }
      )
    }

    // Verify device belongs to user
    const connection = await prisma.connection.findFirst({
      where: { id, accountId }
    })

    if (!connection) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Device not found', results: null },
        { status: 404 }
      )
    }

    if (!connection.deviceId) {
      return NextResponse.json(
        { code: 'ERROR', message: 'Device not registered with WhatsApp service', results: null },
        { status: 400 }
      )
    }

    // Try to reconnect via Difusión
    const reconnectResult = await DevicesAPI.reconnect(connection.deviceId)

    return NextResponse.json({
      code: 'SUCCESS',
      message: reconnectResult.message || 'Reconnect initiated',
      results: null
    })
  } catch (error: unknown) {
    console.error('Error reconnecting device:', error)
    const err = error as { response?: { data?: { message?: string }; status?: number } }
    return NextResponse.json(
      { code: 'ERROR', message: err.response?.data?.message || 'Failed to reconnect', results: null },
      { status: err.response?.status || 500 }
    )
  }
}
