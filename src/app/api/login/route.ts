import { difusionServer, DifusionResponse, LoginResponse } from '@/lib/difusion'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await difusionServer.get<DifusionResponse<LoginResponse>>('/app/login')
    return NextResponse.json(response.data)
  } catch (error: unknown) {
    console.error('Error login:', error)
    const err = error as { response?: { data?: { message?: string }; status?: number } }
    return NextResponse.json(
      { 
        code: 'ERROR', 
        message: err.response?.data?.message || 'Failed to login', 
        results: null 
      },
      { status: err.response?.status || 500 }
    )
  }
}
