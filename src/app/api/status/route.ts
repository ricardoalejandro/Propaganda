import { difusionServer, DifusionResponse, ConnectionStatus } from '@/lib/difusion'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await difusionServer.get<DifusionResponse<ConnectionStatus>>('/app/status')
    return NextResponse.json(response.data)
  } catch (error: unknown) {
    console.error('Error getting status:', error)
    const err = error as { response?: { data?: unknown; status?: number } }
    return NextResponse.json(
      { code: 'ERROR', message: 'Failed to get status', results: null },
      { status: err.response?.status || 500 }
    )
  }
}
