import { difusionServer, withDeviceId, DifusionResponse } from '@/lib/difusion'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SendVideoResponse {
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
        const caption = formData.get('caption') as string | null
        const video = formData.get('video') as File | null
        const videoUrl = formData.get('videoUrl') as string | null
        const deviceId = formData.get('device_id') as string | null
        const connectionId = formData.get('connection_id') as string | null

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

        const actualDeviceId = deviceId || await getDeviceId(connectionId)
        const client = actualDeviceId ? withDeviceId(actualDeviceId) : difusionServer

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

        console.log(`[Send Video] Sending to: ${phone} via device: ${actualDeviceId || 'default'}`)
        const response = await client.post<DifusionResponse<SendVideoResponse>>(
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
