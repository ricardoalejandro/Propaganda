import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const MEDIA_DIR = process.env.MEDIA_DIR || '/app/uploads/media'
const DIFUSION_URL = process.env.NEXT_PUBLIC_DIFUSION_URL || 'https://difusion.naperu.cloud'
const DIFUSION_USER = process.env.DIFUSION_USER || 'admin'
const DIFUSION_PASS = process.env.DIFUSION_PASS || ''

// In-memory cache of failed downloads to avoid retrying
const failedDownloads = new Map<string, { timestamp: number; error: string }>()
const FAILED_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface DownloadRequest {
    url: string
    messageId: string
    filename?: string
}

interface DifusionMediaResponse {
    code: string
    message: string
    results?: {
        message_id: string
        status: string
        media_type: string
        filename: string
        file_path: string
    }
}

// POST: Download media via Difusion proxy API (decrypts WhatsApp media)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as DownloadRequest
        const { messageId, filename } = body

        if (!messageId) {
            return NextResponse.json(
                { code: 'ERROR', message: 'messageId is required' },
                { status: 400 }
            )
        }

        // Check if this download previously failed
        const failedEntry = failedDownloads.get(messageId)
        if (failedEntry) {
            const age = Date.now() - failedEntry.timestamp
            if (age < FAILED_CACHE_TTL) {
                return NextResponse.json({
                    code: 'EXPIRED',
                    message: failedEntry.error,
                    results: { expired: true }
                })
            } else {
                failedDownloads.delete(messageId)
            }
        }

        // Ensure media directory exists
        await fs.mkdir(MEDIA_DIR, { recursive: true })

        // Determine file extension from filename
        let ext = '.jpg' // Default for images
        if (filename) {
            const fileExt = path.extname(filename)
            if (fileExt) ext = fileExt
        }

        const localFilename = `${messageId}${ext}`
        const localPath = path.join(MEDIA_DIR, localFilename)

        // Check if already downloaded
        try {
            await fs.access(localPath)
            const stats = await fs.stat(localPath)
            if (stats.size > 100) {
                return NextResponse.json({
                    code: 'SUCCESS',
                    results: {
                        localPath: `/api/media/${messageId}`,
                        filename: localFilename,
                        cached: true
                    }
                })
            }
            // File exists but too small (likely error), delete and retry
            await fs.unlink(localPath)
        } catch {
            // File doesn't exist, proceed with download
        }

        // Look up message in database to get the chat JID
        const message = await prisma.message.findFirst({
            where: { externalId: messageId },
            include: { chat: true }
        })

        if (!message?.chat?.jid) {
            console.log(`[Media Download] No chat JID found for message ${messageId}`)
            // Cache failure to avoid repeated DB lookups
            failedDownloads.set(messageId, {
                timestamp: Date.now(),
                error: 'Message not found in database'
            })
            return NextResponse.json({
                code: 'NOT_FOUND',
                message: 'Message not found in database',
                results: { expired: false }
            })
        }

        const jid = message.chat.jid
        const authHeader = 'Basic ' + Buffer.from(`${DIFUSION_USER}:${DIFUSION_PASS}`).toString('base64')

        console.log(`[Media Download] Downloading ${messageId} via Difusion proxy...`)

        // Step 1: Call Difusion API to trigger decryption
        const downloadUrl = `${DIFUSION_URL}/message/${messageId}/download?phone=${encodeURIComponent(jid)}`
        
        const response = await fetch(downloadUrl, {
            headers: { 'Authorization': authHeader }
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`[Media Download] Difusion API failed: ${response.status} - ${errorText}`)
            
            failedDownloads.set(messageId, {
                timestamp: Date.now(),
                error: `Difusion API error: ${response.status}`
            })
            
            return NextResponse.json({
                code: response.status === 410 ? 'EXPIRED' : 'DOWNLOAD_FAILED',
                message: `Media download failed: ${response.status}`,
                results: { expired: response.status === 410 }
            })
        }

        const data: DifusionMediaResponse = await response.json()

        if (data.code !== 'SUCCESS' || !data.results?.file_path) {
            console.error(`[Media Download] Difusion returned error: ${data.message}`)
            
            failedDownloads.set(messageId, {
                timestamp: Date.now(),
                error: data.message || 'Difusion download failed'
            })
            
            return NextResponse.json({
                code: 'EXPIRED',
                message: data.message || 'Media decryption failed',
                results: { expired: true }
            })
        }

        // Step 2: Download the decrypted file from Difusion's statics path
        const fileUrl = `${DIFUSION_URL}/${data.results.file_path}`
        console.log(`[Media Download] Fetching decrypted file from: ${fileUrl}`)

        const fileResponse = await fetch(fileUrl, {
            headers: { 'Authorization': authHeader }
        })

        if (!fileResponse.ok) {
            console.error(`[Media Download] File fetch failed: ${fileResponse.status}`)
            
            failedDownloads.set(messageId, {
                timestamp: Date.now(),
                error: `Failed to fetch decrypted file: ${fileResponse.status}`
            })
            
            return NextResponse.json({
                code: 'DOWNLOAD_FAILED',
                message: 'Failed to fetch decrypted media',
                results: { expired: false }
            })
        }

        const mediaBuffer = Buffer.from(await fileResponse.arrayBuffer())

        // Update extension based on actual content
        if (mediaBuffer[0] === 0xff && mediaBuffer[1] === 0xd8) {
            ext = '.jpg'
        } else if (mediaBuffer.slice(4, 8).toString() === 'ftyp') {
            ext = '.mp4'
        } else if (mediaBuffer.slice(0, 4).toString() === 'OggS') {
            ext = '.ogg'
        }

        const finalFilename = `${messageId}${ext}`
        const finalPath = path.join(MEDIA_DIR, finalFilename)

        await fs.writeFile(finalPath, mediaBuffer)
        console.log(`[Media Download] Saved ${finalFilename} (${mediaBuffer.length} bytes)`)

        return NextResponse.json({
            code: 'SUCCESS',
            results: {
                localPath: `/api/media/${messageId}`,
                filename: finalFilename,
                size: mediaBuffer.length,
                cached: false
            }
        })
    } catch (error) {
        console.error('Error in media download:', error)
        const message = error instanceof Error ? error.message : 'Failed to download media'
        return NextResponse.json(
            { code: 'ERROR', message },
            { status: 500 }
        )
    }
}
