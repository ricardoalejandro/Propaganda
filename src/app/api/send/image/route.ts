import { difusionServer, DifusionResponse } from '@/lib/difusion'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SendImageResponse {
    message_id: string
    status: string
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const phone = formData.get('phone') as string
        const caption = formData.get('caption') as string | null
        const image = formData.get('image') as File | null
        const imageUrl = formData.get('imageUrl') as string | null

        if (!phone) {
            return NextResponse.json(
                { code: 'ERROR', message: 'Phone is required', results: null },
                { status: 400 }
            )
        }

        if (!image && !imageUrl) {
            return NextResponse.json(
                { code: 'ERROR', message: 'Image or ImageURL is required', results: null },
                { status: 400 }
            )
        }

        let requestBody: Record<string, unknown>

        if (imageUrl) {
            // Send via URL
            requestBody = {
                phone,
                image_url: imageUrl,
                caption: caption || undefined
            }
        } else if (image) {
            // Convert to base64
            const bytes = await image.arrayBuffer()
            const base64 = Buffer.from(bytes).toString('base64')

            requestBody = {
                phone,
                image: base64,
                caption: caption || undefined
            }
        } else {
            return NextResponse.json(
                { code: 'ERROR', message: 'No image provided', results: null },
                { status: 400 }
            )
        }

        console.log(`[Send Image] Sending to: ${phone}`)
        const response = await difusionServer.post<DifusionResponse<SendImageResponse>>(
            '/send/image',
            requestBody
        )
        console.log(`[Send Image] Response:`, JSON.stringify(response.data))

        return NextResponse.json(response.data)
    } catch (error: unknown) {
        console.error('Error sending image:', error)
        const err = error as { response?: { data?: { message?: string }; status?: number } }
        return NextResponse.json(
            {
                code: 'ERROR',
                message: err.response?.data?.message || 'Failed to send image',
                results: null
            },
            { status: err.response?.status || 500 }
        )
    }
}
