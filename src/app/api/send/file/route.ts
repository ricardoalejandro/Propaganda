import { difusionServer, withDeviceId, DifusionResponse } from '@/lib/difusion'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import FormData from 'form-data'

export const dynamic = 'force-dynamic'

interface SendFileResponse {
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
        const file = formData.get('file') as File | null
        const deviceId = formData.get('device_id') as string | null
        const connectionId = formData.get('connection_id') as string | null

        if (!phone) {
            return NextResponse.json(
                { code: 'ERROR', message: 'Phone is required', results: null },
                { status: 400 }
            )
        }

        if (!file) {
            return NextResponse.json(
                { code: 'ERROR', message: 'File is required', results: null },
                { status: 400 }
            )
        }

        const actualDeviceId = deviceId || await getDeviceId(connectionId)
        const client = actualDeviceId ? withDeviceId(actualDeviceId) : difusionServer

        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Create multipart form data for difusion API
        const difusionFormData = new FormData()
        difusionFormData.append('phone', phone)
        difusionFormData.append('file', buffer, {
            filename: file.name,
            contentType: file.type,
        })

        console.log(`[Send File] Sending ${file.name} to: ${phone} via device: ${actualDeviceId || 'default'}`)

        const response = await client.post<DifusionResponse<SendFileResponse>>(
            '/send/file',
            difusionFormData,
            {
                headers: {
                    ...difusionFormData.getHeaders(),
                },
            }
        )
        console.log(`[Send File] Response:`, JSON.stringify(response.data))

        return NextResponse.json(response.data)
    } catch (error: unknown) {
        console.error('Error sending file:', error)
        const err = error as { response?: { data?: { message?: string }; status?: number } }
        return NextResponse.json(
            {
                code: 'ERROR',
                message: err.response?.data?.message || 'Failed to send file',
                results: null
            },
            { status: err.response?.status || 500 }
        )
    }
}
