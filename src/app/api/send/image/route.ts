import { difusionServer, DifusionResponse } from '@/lib/difusion'
import { NextRequest, NextResponse } from 'next/server'
import FormData from 'form-data'

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

        let response

        if (imageUrl) {
            // Send via URL (JSON body)
            console.log(`[Send Image] Sending URL to: ${phone}`)
            response = await difusionServer.post<DifusionResponse<SendImageResponse>>(
                '/send/image',
                {
                    phone,
                    image_url: imageUrl,
                    caption: caption || undefined
                }
            )
        } else if (image) {
            // Send via multipart form-data
            const bytes = await image.arrayBuffer()
            const buffer = Buffer.from(bytes)

            const difusionFormData = new FormData()
            difusionFormData.append('phone', phone)
            difusionFormData.append('image', buffer, {
                filename: image.name || 'image.jpg',
                contentType: image.type || 'image/jpeg',
            })
            if (caption) {
                difusionFormData.append('caption', caption)
            }

            console.log(`[Send Image] Sending file to: ${phone}`)
            response = await difusionServer.post<DifusionResponse<SendImageResponse>>(
                '/send/image',
                difusionFormData,
                {
                    headers: {
                        ...difusionFormData.getHeaders(),
                    },
                }
            )
        } else {
            return NextResponse.json(
                { code: 'ERROR', message: 'No image provided', results: null },
                { status: 400 }
            )
        }

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
