import { difusionServer, withDeviceId, DifusionResponse } from '@/lib/difusion'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import FormData from 'form-data'

export const dynamic = 'force-dynamic'

interface SendImageResponse {
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
        const image = formData.get('image') as File | null
        const imageUrl = formData.get('imageUrl') as string | null
        const deviceId = formData.get('device_id') as string | null
        const connectionId = formData.get('connection_id') as string | null

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

        const actualDeviceId = deviceId || await getDeviceId(connectionId)
        const client = actualDeviceId ? withDeviceId(actualDeviceId) : difusionServer

        let response

        if (imageUrl) {
            // Send via URL (JSON body)
            console.log(`[Send Image] Sending URL to: ${phone} via device: ${actualDeviceId || 'default'}`)
            response = await client.post<DifusionResponse<SendImageResponse>>(
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

            console.log(`[Send Image] Sending file to: ${phone} via device: ${actualDeviceId || 'default'}`)
            response = await client.post<DifusionResponse<SendImageResponse>>(
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
