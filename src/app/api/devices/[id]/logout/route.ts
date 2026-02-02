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

// POST /api/devices/[id]/logout - Logout device from WhatsApp
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

    // Logout from Difusión
    const logoutResult = await DevicesAPI.logout(connection.deviceId)

    // Update local state
    await prisma.connection.update({
      where: { id: connection.id },
      data: { isLoggedIn: false, isConnected: false }
    })

    return NextResponse.json({
      code: 'SUCCESS',
      message: logoutResult.message || 'Logged out successfully',
      results: null
    })
  } catch (error: unknown) {
    console.error('Error logging out device:', error)
    const err = error as { response?: { data?: { message?: string }; status?: number } }
    return NextResponse.json(
      { code: 'ERROR', message: err.response?.data?.message || 'Failed to logout', results: null },
      { status: err.response?.status || 500 }
    )
  }
}
