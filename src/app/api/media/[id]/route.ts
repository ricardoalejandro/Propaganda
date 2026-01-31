import { NextRequest, NextResponse } from 'next/server'
import { getMediaPath, downloadMedia } from '@/lib/media-download'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import mime from 'mime-types'

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // 1. Try to find file path using helper
        let filePath = await getMediaPath(id)

        // 2. If not found, try to recover (Self-Healing)
        if (!filePath) {
            console.log(`[Media API] File not found for ${id}, attempting recovery...`)

            // Look up message in DB to get original URL and chat JID
            const message = await prisma.message.findFirst({
                where: { externalId: id },
                include: { chat: true }
            })

            if (message?.url && message.mediaType && message.chat?.jid) {
                console.log(`[Media API] Found message record, re-downloading...`)
                const downloadedPath = await downloadMedia(message.url, id, message.mediaType, message.chat.jid)

                if (downloadedPath) {
                    // Try to get path again
                    filePath = await getMediaPath(id)
                }
            }
        }

        if (!filePath) {
            console.error(`[Media API] Media definitely not found for ${id}`)
            return new NextResponse('Media not found', { status: 404 })
        }

        // 3. Read and serve file
        const fileBuffer = await fs.readFile(filePath)

        // Determine mime type
        const mimeType = mime.lookup(filePath) || 'application/octet-stream'

        // Return file
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': mimeType,
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        })

    } catch (err) {
        console.error('Error serving media:', err)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
