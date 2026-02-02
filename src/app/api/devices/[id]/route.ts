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

// Helper to verify device belongs to user's account
async function verifyDeviceOwnership(connectionId: string, accountId: string) {
  const connection = await prisma.connection.findFirst({
    where: {
      id: connectionId,
      accountId
    }
  })
  return connection
}

// GET /api/devices/[id] - Get device info
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

    const connection = await verifyDeviceOwnership(id, accountId)
    if (!connection) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Device not found', results: null },
        { status: 404 }
      )
    }

    // Get status from Difusión
    let difusionStatus = null
    if (connection.deviceId) {
      try {
        const statusResult = await DevicesAPI.status(connection.deviceId)
        difusionStatus = statusResult.results
      } catch (e) {
        console.log('Could not get difusion status:', e)
      }
    }

    return NextResponse.json({
      code: 'SUCCESS',
      message: 'Device info',
      results: {
        id: connection.id,
        name: connection.name,
        deviceId: connection.deviceId,
        isConnected: difusionStatus?.is_connected || false,
        isLoggedIn: difusionStatus?.is_logged_in || false,
        jid: difusionStatus?.jid || null,
        displayName: difusionStatus?.display_name || connection.name
      }
    })
  } catch (error: unknown) {
    console.error('Error getting device:', error)
    return NextResponse.json(
      { code: 'ERROR', message: 'Failed to get device', results: null },
      { status: 500 }
    )
  }
}

// DELETE /api/devices/[id] - Remove device
export async function DELETE(
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

    const connection = await verifyDeviceOwnership(id, accountId)
    if (!connection) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Device not found', results: null },
        { status: 404 }
      )
    }

    // Delete from Difusión first
    if (connection.deviceId) {
      try {
        await DevicesAPI.delete(connection.deviceId)
      } catch (e) {
        console.log('Could not delete from difusion (might already be gone):', e)
      }
    }

    // Delete from our DB (cascades to chats/messages)
    await prisma.connection.delete({
      where: { id: connection.id }
    })

    return NextResponse.json({
      code: 'SUCCESS',
      message: 'Device deleted',
      results: null
    })
  } catch (error: unknown) {
    console.error('Error deleting device:', error)
    return NextResponse.json(
      { code: 'ERROR', message: 'Failed to delete device', results: null },
      { status: 500 }
    )
  }
}

// PATCH /api/devices/[id] - Update device name
export async function PATCH(
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

    const connection = await verifyDeviceOwnership(id, accountId)
    if (!connection) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Device not found', results: null },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name } = body

    if (name) {
      await prisma.connection.update({
        where: { id: connection.id },
        data: { name }
      })
    }

    return NextResponse.json({
      code: 'SUCCESS',
      message: 'Device updated',
      results: { id: connection.id, name: name || connection.name }
    })
  } catch (error: unknown) {
    console.error('Error updating device:', error)
    return NextResponse.json(
      { code: 'ERROR', message: 'Failed to update device', results: null },
      { status: 500 }
    )
  }
}
