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

// GET /api/devices/[id]/login - Get QR code for device login
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

    let deviceId = connection.deviceId

    // If connection doesn't have a deviceId, register it with Difusión first
    if (!deviceId) {
      console.log('[Login] Connection has no deviceId, registering with Difusión...')
      try {
        const createResult = await DevicesAPI.create(connection.name)
        console.log('[Login] Difusión create response:', JSON.stringify(createResult))
        
        // Handle different response formats from Difusión
        // results could have 'id' or 'device_id'
        const newDeviceId = createResult.results?.id || (createResult.results as { device_id?: string })?.device_id
        
        if (newDeviceId) {
          deviceId = newDeviceId
          // Update connection with the new deviceId
          await prisma.connection.update({
            where: { id },
            data: { deviceId }
          })
          console.log('[Login] Registered device with Difusión, deviceId:', deviceId)
        } else {
          return NextResponse.json(
            { code: 'ERROR', message: createResult.message || 'Failed to register device with WhatsApp service', results: null },
            { status: 400 }
          )
        }
      } catch (regError) {
        console.error('[Login] Failed to register device:', regError)
        return NextResponse.json(
          { code: 'ERROR', message: 'Failed to register device with WhatsApp service', results: null },
          { status: 500 }
        )
      }
    }

    // Get QR code from Difusión
    const loginResult = await DevicesAPI.login(deviceId)

    if (loginResult.code !== 'SUCCESS') {
      return NextResponse.json(
        { code: 'ERROR', message: loginResult.message || 'Failed to get QR code', results: null },
        { status: 400 }
      )
    }

    return NextResponse.json({
      code: 'SUCCESS',
      message: 'QR code generated',
      results: {
        qr_link: loginResult.results?.qr_link,
        qr_duration: loginResult.results?.qr_duration || 60
      }
    })
  } catch (error: unknown) {
    console.error('Error getting QR code:', error)
    const err = error as { response?: { data?: { message?: string; code?: string }; status?: number } }
    return NextResponse.json(
      { code: err.response?.data?.code || 'ERROR', message: err.response?.data?.message || 'Failed to get QR code', results: null },
      { status: err.response?.status || 500 }
    )
  }
}

// POST /api/devices/[id]/login - Get QR code for device login (legacy)
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

    if (!session.accountId) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'No account associated', results: null },
        { status: 401 }
      )
    }

    // Verify device belongs to user
    const connection = await prisma.connection.findFirst({
      where: { id, accountId: session.accountId }
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

    // Get QR code from Difusión
    const loginResult = await DevicesAPI.login(connection.deviceId)

    if (loginResult.code !== 'SUCCESS') {
      return NextResponse.json(
        { code: 'ERROR', message: loginResult.message || 'Failed to get QR code', results: null },
        { status: 400 }
      )
    }

    return NextResponse.json({
      code: 'SUCCESS',
      message: 'QR code generated',
      results: {
        qr_link: loginResult.results?.qr_link,
        qr_duration: loginResult.results?.qr_duration || 60
      }
    })
  } catch (error: unknown) {
    console.error('Error getting QR code:', error)
    const err = error as { response?: { data?: { message?: string; code?: string }; status?: number } }
    return NextResponse.json(
      { code: err.response?.data?.code || 'ERROR', message: err.response?.data?.message || 'Failed to get QR code', results: null },
      { status: err.response?.status || 500 }
    )
  }
}
