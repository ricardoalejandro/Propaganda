import { difusionServer, DifusionResponse, LoginResponse } from '@/lib/difusion'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DIFUSION_USER = 'admin'
const DIFUSION_PASS = 'c2rfoitp1ennzsfsdfsdlkl79mg3rstydwels'

// POST handler for new connection creation
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { deviceName } = body

    // Pass device parameter to GET handler logic (which calls upstream)
    // Note: Upstream API might expect 'device' query param or body
    // We try query param for GET request to upstream login
    return GET(deviceName)
  } catch (error) {
    console.error('Error in login POST:', error)
    return GET() // Fallback
  }
}

export async function GET(deviceName?: string) {
  try {
    // Construct URL with device param if provided
    const endpoint = deviceName
      ? `/app/login?device=${encodeURIComponent(deviceName)}`
      : '/app/login'

    const response = await difusionServer.get<DifusionResponse<LoginResponse>>(endpoint)
    const data = response.data

    // If we got a QR link, fetch the image and convert to base64
    if (data.results?.qr_link) {
      console.log('Original QR Link:', data.results.qr_link)
      const qrUrl = data.results.qr_link.replace('http://', 'https://')
      console.log('Transformed QR URL:', qrUrl)

      try {
        const imageResponse = await fetch(qrUrl, {
          cache: 'no-store',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${DIFUSION_USER}:${DIFUSION_PASS}`).toString('base64')
          }
        })

        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer()
          const base64 = Buffer.from(imageBuffer).toString('base64')
          data.results.qr_link = `data:image/png;base64,${base64}`
        }
      } catch (imgError) {
        console.error('Error fetching QR image:', imgError)
        // Keep original URL as fallback
        data.results.qr_link = qrUrl
      }
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
  } catch (error: unknown) {
    console.error('Error login:', error)
    const err = error as { response?: { data?: { message?: string }; status?: number } }

    // Check for ALREADY_LOGGED_IN which might happen if device name is reused or ignored
    if (err.response?.data?.message === 'you are already logged in.') {
      return NextResponse.json(
        {
          code: 'ALREADY_LOGGED_IN',
          message: 'Ya existe una sesión activa con este nombre o por defecto. Intenta con otro nombre.',
          results: null
        },
        { status: 400 }
      )
    }

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
