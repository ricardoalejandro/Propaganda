import { difusionServer, withDeviceId, DifusionResponse, SendMessageResponse } from '@/lib/difusion'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, message, device_id, connection_id } = body

    if (!phone || !message) {
      return NextResponse.json(
        { code: 'ERROR', message: 'Phone and message are required', results: null },
        { status: 400 }
      )
    }

    // Get device_id from connection if provided
    let actualDeviceId = device_id
    
    if (connection_id && !device_id) {
      const cookieStore = await cookies()
      const token = cookieStore.get('auth-token')?.value
      
      if (token) {
        const session = await getSession()
        if (session?.accountId) {
          const connection = await prisma.connection.findFirst({
            where: { id: connection_id, accountId: session.accountId }
          })
          if (connection?.deviceId) {
            actualDeviceId = connection.deviceId
          }
        }
      }
    }

    console.log(`[Send] Attempting to send message to: ${phone} via device: ${actualDeviceId || 'default'}`)
    
    const client = actualDeviceId ? withDeviceId(actualDeviceId) : difusionServer
    const response = await client.post<DifusionResponse<SendMessageResponse>>(
      '/send/message',
      { phone, message }
    )
    
    console.log(`[Send] Response:`, JSON.stringify(response.data))
    return NextResponse.json(response.data)
  } catch (error: unknown) {
    console.error('Error sending message:', error)
    const err = error as { response?: { data?: { message?: string }; status?: number } }
    return NextResponse.json(
      {
        code: 'ERROR',
        message: err.response?.data?.message || 'Failed to send message',
        results: null
      },
      { status: err.response?.status || 500 }
    )
  }
}
