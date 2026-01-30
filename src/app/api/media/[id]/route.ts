import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const MEDIA_DIR = process.env.MEDIA_DIR || '/app/uploads/media'

// GET: Serve a specific media file
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Sanitize filename to prevent path traversal
        const sanitizedId = path.basename(params.id)
        const filePath = path.join(MEDIA_DIR, sanitizedId)

        // Check if file exists
        try {
            await fs.access(filePath)
        } catch {
            return NextResponse.json(
                { code: 'ERROR', message: 'File not found' },
                { status: 404 }
            )
        }

        const fileBuffer = await fs.readFile(filePath)

        // Determine content type
        const ext = path.extname(sanitizedId).toLowerCase()
        let contentType = 'application/octet-stream'

        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.3gp': 'video/3gpp',
            '.mp3': 'audio/mpeg',
            '.ogg': 'audio/ogg',
            '.opus': 'audio/opus',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }

        if (mimeTypes[ext]) {
            contentType = mimeTypes[ext]
        }

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000',
            },
        })
    } catch (error) {
        console.error('Error serving media file:', error)
        return NextResponse.json(
            { code: 'ERROR', message: 'Failed to serve media file' },
            { status: 500 }
        )
    }
}
