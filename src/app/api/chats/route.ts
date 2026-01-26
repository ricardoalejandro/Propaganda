import { difusionServer, DifusionResponse, ChatListResponse } from '@/lib/difusion'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await difusionServer.get<DifusionResponse<ChatListResponse>>('/chats?limit=100')
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
