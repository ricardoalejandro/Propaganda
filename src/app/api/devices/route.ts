import { DevicesAPI } from '@/lib/difusion'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Helper to get accountId - from session or lookup from DB
async function getAccountId(session: { userId: string; accountId: string | null } | null): Promise<string | null> {
  if (!session) return null
  if (session.accountId) return session.accountId
  
  // Fallback: lookup from user in DB (handles old tokens without accountId)
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { accountId: true }
  })
  return user?.accountId || null
}

// GET /api/devices - List all devices for the current account
export async function GET() {
  try {
    // Verify session and get account
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

    // Get connections from our DB for this account
    const dbConnections = await prisma.connection.findMany({
      where: { accountId }
    })

    // Try to get devices from Difusión API (may fail if service is down)
    let difusionDevices: { results?: Array<{ id: string; jid?: string; display_name?: string; state?: string }> } = { results: [] }
    try {
      difusionDevices = await DevicesAPI.list()
    } catch (err) {
      console.log('[API/devices] Difusión unavailable, using DB only')
    }

    // Map DB connections with Difusión device status
    const devices = dbConnections.map(conn => {
      const difusionDevice = difusionDevices.results?.find(d => d.id === conn.deviceId)
      return {
        id: conn.id,
        name: conn.name,
        deviceId: conn.deviceId,
        jid: difusionDevice?.jid || null,
        displayName: difusionDevice?.display_name || conn.name,
        state: difusionDevice?.state || 'unknown',
        isConnected: difusionDevice?.state === 'connected',
        isLoggedIn: !!difusionDevice?.jid,
        createdAt: conn.createdAt.toISOString(),
        updatedAt: conn.updatedAt.toISOString()
      }
    })

    return NextResponse.json({
      code: 'SUCCESS',
      message: 'Devices listed',
      results: devices
    })
  } catch (error: unknown) {
    console.error('Error listing devices:', error)
    const err = error as { response?: { data?: { message?: string }; status?: number } }
    return NextResponse.json(
      { code: 'ERROR', message: err.response?.data?.message || 'Failed to list devices', results: [] },
      { status: err.response?.status || 500 }
    )
  }
}

// POST /api/devices - Create a new device
export async function POST(request: NextRequest) {
  try {
    // Verify session and get account
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

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { code: 'ERROR', message: 'Device name is required', results: null },
        { status: 400 }
      )
    }

    // Check connection limit (100 per account)
    const connectionCount = await prisma.connection.count({
      where: { accountId }
    })

    if (connectionCount >= 100) {
      return NextResponse.json(
        { code: 'ERROR', message: 'Maximum 100 connections per account reached', results: null },
        { status: 400 }
      )
    }

    // Create device in Difusión
    const difusionResult = await DevicesAPI.create(name)

    if (difusionResult.code !== 'SUCCESS' || !difusionResult.results) {
      return NextResponse.json(
        { code: 'ERROR', message: difusionResult.message || 'Failed to create device', results: null },
        { status: 400 }
      )
    }

    // Store connection in our DB
    const connection = await prisma.connection.create({
      data: {
        name,
        deviceId: difusionResult.results.id,
        accountId,
        isConnected: false,
        isLoggedIn: false
      }
    })

    return NextResponse.json({
      code: 'SUCCESS',
      message: 'Device created',
      results: {
        id: connection.id,
        name: connection.name,
        deviceId: connection.deviceId,
        state: difusionResult.results.state,
        createdAt: connection.createdAt.toISOString()
      }
    })
  } catch (error: unknown) {
    console.error('Error creating device:', error)
    const err = error as { response?: { data?: { message?: string }; status?: number } }
    return NextResponse.json(
      { code: 'ERROR', message: err.response?.data?.message || 'Failed to create device', results: null },
      { status: err.response?.status || 500 }
    )
  }
}
