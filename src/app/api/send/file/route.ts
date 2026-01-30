import { difusionServer, DifusionResponse } from '@/lib/difusion'
import { NextRequest, NextResponse } from 'next/server'
import FormData from 'form-data'

export const dynamic = 'force-dynamic'

interface SendFileResponse {
    message_id: string
    status: string
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const phone = formData.get('phone') as string
        const file = formData.get('file') as File | null

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

        console.log(`[Send File] Sending ${file.name} to: ${phone}`)

        const response = await difusionServer.post<DifusionResponse<SendFileResponse>>(
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
