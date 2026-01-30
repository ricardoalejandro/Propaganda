import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const MEDIA_DIR = process.env.MEDIA_DIR || '/app/uploads/media'

interface MediaFile {
    id: string
    filename: string
    type: string
    size: number
    createdAt: string
    thumbnail?: string
}

// GET: List all media files with their sizes
export async function GET() {
    try {
        // Ensure directory exists
        await fs.mkdir(MEDIA_DIR, { recursive: true })

        const files = await fs.readdir(MEDIA_DIR)
        const mediaFiles: MediaFile[] = []
        let totalSize = 0

        for (const file of files) {
            if (file.startsWith('.')) continue // Skip hidden files

            const filePath = path.join(MEDIA_DIR, file)
            const stats = await fs.stat(filePath)

            if (stats.isFile()) {
                const ext = path.extname(file).toLowerCase()
                let type = 'document'
                if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) type = 'image'
                else if (['.mp4', '.mov', '.avi', '.3gp'].includes(ext)) type = 'video'
                else if (['.mp3', '.ogg', '.opus', '.wav', '.m4a'].includes(ext)) type = 'audio'

                mediaFiles.push({
                    id: file,
                    filename: file,
                    type,
                    size: stats.size,
                    createdAt: stats.birthtime.toISOString(),
                })
                totalSize += stats.size
            }
        }

        // Sort by creation date descending
        mediaFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        return NextResponse.json({
            code: 'SUCCESS',
            results: {
                files: mediaFiles,
                totalSize,
                count: mediaFiles.length
            }
        })
    } catch (error) {
        console.error('Error listing media files:', error)
        return NextResponse.json(
            { code: 'ERROR', message: 'Failed to list media files' },
            { status: 500 }
        )
    }
}

// DELETE: Delete selected media files
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json()
        const { fileIds } = body as { fileIds: string[] }

        if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
            return NextResponse.json(
                { code: 'ERROR', message: 'fileIds array is required' },
                { status: 400 }
            )
        }

        let deletedCount = 0
        let freedSpace = 0

        for (const fileId of fileIds) {
            // Sanitize filename to prevent path traversal
            const sanitizedId = path.basename(fileId)
            const filePath = path.join(MEDIA_DIR, sanitizedId)

            try {
                const stats = await fs.stat(filePath)
                await fs.unlink(filePath)
                deletedCount++
                freedSpace += stats.size
            } catch {
                // File doesn't exist or can't be deleted, skip
                console.warn(`Could not delete file: ${sanitizedId}`)
            }
        }

        return NextResponse.json({
            code: 'SUCCESS',
            results: {
                deletedCount,
                freedSpace
            }
        })
    } catch (error) {
        console.error('Error deleting media files:', error)
        return NextResponse.json(
            { code: 'ERROR', message: 'Failed to delete media files' },
            { status: 500 }
        )
    }
}
