import { difusionServer, DifusionResponse, MessagesResponse } from '@/lib/difusion'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jid: string }> }
) {
  try {
    const { jid } = await params
    const decodedJid = decodeURIComponent(jid)
    const response = await difusionServer.get<DifusionResponse<MessagesResponse>>(
      `/chat/${decodedJid}/messages?limit=100`
    )
    return NextResponse.json(response.data)
  } catch (error: unknown) {
    console.error('Error getting messages:', error)
    const err = error as { response?: { status?: number } }
    return NextResponse.json(
      { code: 'ERROR', message: 'Failed to get messages', results: { data: [], pagination: {} } },
      { status: err.response?.status || 500 }
    )
  }
}
