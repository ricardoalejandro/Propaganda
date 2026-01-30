import { difusionServer, DifusionResponse } from '@/lib/difusion'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SendVideoResponse {
    message_id: string
    status: string
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const phone = formData.get('phone') as string
        const caption = formData.get('caption') as string | null
        const video = formData.get('video') as File | null
        const videoUrl = formData.get('videoUrl') as string | null

        if (!phone) {
            return NextResponse.json(
                { code: 'ERROR', message: 'Phone is required', results: null },
                { status: 400 }
            )
        }

        if (!video && !videoUrl) {
            return NextResponse.json(
                { code: 'ERROR', message: 'Video or VideoURL is required', results: null },
                { status: 400 }
            )
        }

        let requestBody: Record<string, unknown>

        if (videoUrl) {
            requestBody = {
                phone,
                video_url: videoUrl,
                caption: caption || undefined
            }
        } else if (video) {
            // Convert to base64
            const bytes = await video.arrayBuffer()
            const base64 = Buffer.from(bytes).toString('base64')

            requestBody = {
                phone,
                video: base64,
                caption: caption || undefined
            }
        } else {
            return NextResponse.json(
                { code: 'ERROR', message: 'No video provided', results: null },
                { status: 400 }
            )
        }

        console.log(`[Send Video] Sending to: ${phone}`)
        const response = await difusionServer.post<DifusionResponse<SendVideoResponse>>(
            '/send/video',
            requestBody
        )
        console.log(`[Send Video] Response:`, JSON.stringify(response.data))

        return NextResponse.json(response.data)
    } catch (error: unknown) {
        console.error('Error sending video:', error)
        const err = error as { response?: { data?: { message?: string }; status?: number } }
        return NextResponse.json(
            {
                code: 'ERROR',
                message: err.response?.data?.message || 'Failed to send video',
                results: null
            },
            { status: err.response?.status || 500 }
        )
    }
}
