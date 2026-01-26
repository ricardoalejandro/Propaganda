import { difusionServer, DifusionResponse, ContactsResponse } from '@/lib/difusion'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await difusionServer.get<DifusionResponse<ContactsResponse>>('/user/my/contacts')
    return NextResponse.json(response.data)
  } catch (error: unknown) {
    console.error('Error getting contacts:', error)
    const err = error as { response?: { status?: number } }
    return NextResponse.json(
      { code: 'ERROR', message: 'Failed to get contacts', results: { data: [] } },
      { status: err.response?.status || 500 }
    )
  }
}
