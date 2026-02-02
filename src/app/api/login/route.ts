import { difusionServer, DifusionResponse, LoginResponse } from '@/lib/difusion'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DIFUSION_USER = 'admin'
const DIFUSION_PASS = 'c2rfoitp1ennzsfsdfsdlkl79mg3rstydwels'

export async function GET() {
  try {
    const response = await difusionServer.get<DifusionResponse<LoginResponse>>('/app/login')
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

        console.log('Image Fetch Status:', imageResponse.status)

        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer()
          const base64 = Buffer.from(imageBuffer).toString('base64')
          data.results.qr_link = `data:image/png;base64,${base64}`
          console.log('Successfully converted QR to base64')
        } else {
          console.error('Failed to fetch image:', imageResponse.statusText)
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
