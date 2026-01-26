import { difusionServer } from '@/lib/difusion'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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
