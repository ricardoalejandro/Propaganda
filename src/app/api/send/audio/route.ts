import { difusionServer, DifusionResponse } from '@/lib/difusion'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SendAudioResponse {
    message_id: string
    status: string
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const phone = formData.get('phone') as string
        const audio = formData.get('audio') as File | null
        const audioUrl = formData.get('audioUrl') as string | null

        if (!phone) {
            return NextResponse.json(
                { code: 'ERROR', message: 'Phone is required', results: null },
                { status: 400 }
            )
        }

        if (!audio && !audioUrl) {
            return NextResponse.json(
                { code: 'ERROR', message: 'Audio or AudioURL is required', results: null },
                { status: 400 }
            )
        }

        let requestBody: Record<string, unknown>

        if (audioUrl) {
            requestBody = {
                phone,
                audio_url: audioUrl
            }
        } else if (audio) {
            // Convert to base64
            const bytes = await audio.arrayBuffer()
            const base64 = Buffer.from(bytes).toString('base64')

            requestBody = {
                phone,
                audio: base64
            }
        } else {
            return NextResponse.json(
                { code: 'ERROR', message: 'No audio provided', results: null },
                { status: 400 }
            )
        }

        console.log(`[Send Audio] Sending to: ${phone}`)
        const response = await difusionServer.post<DifusionResponse<SendAudioResponse>>(
            '/send/audio',
            requestBody
        )
        console.log(`[Send Audio] Response:`, JSON.stringify(response.data))

        return NextResponse.json(response.data)
    } catch (error: unknown) {
        console.error('Error sending audio:', error)
        const err = error as { response?: { data?: { message?: string }; status?: number } }
        return NextResponse.json(
            {
                code: 'ERROR',
                message: err.response?.data?.message || 'Failed to send audio',
                results: null
            },
            { status: err.response?.status || 500 }
        )
    }
}
