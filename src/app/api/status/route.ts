import { difusionServer, DifusionResponse, ConnectionStatus } from '@/lib/difusion'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Define types for the new response format
interface Device {
  name: string
  device: string
}

export async function GET() {
  try {
    // Fetch devices list instead of single status
    const response = await difusionServer.get<DifusionResponse<Device[]>>('/app/devices')
    return NextResponse.json(response.data)
  } catch (error: unknown) {
    console.error('Error getting devices:', error)
    const err = error as { response?: { data?: unknown; status?: number } }
    return NextResponse.json(
      { code: 'ERROR', message: 'Failed to get devices', results: [] },
      { status: err.response?.status || 500 }
    )
  }
}
