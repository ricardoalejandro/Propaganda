import { difusionServer, withDeviceId, DifusionResponse } from '@/lib/difusion'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SendAudioResponse {
    message_id: string
    status: string
}

async function getDeviceId(connectionId: string | null): Promise<string | null> {
    if (!connectionId) return null
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    if (!token) return null
    
    try {
        const session = await getSession()
        if (!session?.accountId) return null
        
        const connection = await prisma.connection.findFirst({
            where: { id: connectionId, accountId: session.accountId }
        })
        return connection?.deviceId || null
    } catch {
        return null
    }
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const phone = formData.get('phone') as string
        const audio = formData.get('audio') as File | null
        const audioUrl = formData.get('audioUrl') as string | null
        const deviceId = formData.get('device_id') as string | null
        const connectionId = formData.get('connection_id') as string | null

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

        const actualDeviceId = deviceId || await getDeviceId(connectionId)
        const client = actualDeviceId ? withDeviceId(actualDeviceId) : difusionServer

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

        console.log(`[Send Audio] Sending to: ${phone} via device: ${actualDeviceId || 'default'}`)
        const response = await client.post<DifusionResponse<SendAudioResponse>>(
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
