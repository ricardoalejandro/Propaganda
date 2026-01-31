import { difusionServer } from '@/lib/difusion'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { deviceId } = body

    // Call upstream logout with device parameter
    // Assuming upstream supports POST /app/logout-device or similar, 
    // but standard is /app/logout with body
    const response = await difusionServer.post('/app/logout', {
      device: deviceId
    })

    return NextResponse.json(response.data)
  } catch (error: unknown) {
    console.error('Error logout:', error)
    const err = error as { response?: { data?: { message?: string }; status?: number } }
    return NextResponse.json(
      {
        code: 'ERROR',
        message: err.response?.data?.message || 'Failed to logout device',
        results: null
      },
      { status: err.response?.status || 500 }
    )
  }
}

export async function GET() {
  try {
    const response = await difusionServer.get('/app/logout')
    return NextResponse.json(response.data)
  } catch (error: unknown) {
    console.error('Error logout:', error)
    const err = error as { response?: { data?: { message?: string }; status?: number } }
    return NextResponse.json(
      {
        code: 'ERROR',
        message: err.response?.data?.message || 'Failed to logout',
        results: null
      },
      { status: err.response?.status || 500 }
    )
  }
}
