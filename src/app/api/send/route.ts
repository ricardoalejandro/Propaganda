import { difusionServer, DifusionResponse, SendMessageResponse } from '@/lib/difusion'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, message } = body

    if (!phone || !message) {
      return NextResponse.json(
        { code: 'ERROR', message: 'Phone and message are required', results: null },
        { status: 400 }
      )
    }

    const response = await difusionServer.post<DifusionResponse<SendMessageResponse>>(
      '/send/message',
      { phone, message }
    )
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
