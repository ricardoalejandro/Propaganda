import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import https from 'https'
import http from 'http'

export const dynamic = 'force-dynamic'

const MEDIA_DIR = process.env.MEDIA_DIR || '/app/uploads/media'

// In-memory cache of failed downloads to avoid retrying
const failedDownloads = new Map<string, { timestamp: number; error: string }>()
const FAILED_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface DownloadRequest {
    url: string
    messageId: string
    filename?: string
}

interface DownloadResult {
    success: boolean
    statusCode?: number
    error?: string
}

// Download a file from URL and save locally
async function downloadFile(url: string, destPath: string): Promise<DownloadResult> {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : http

        const request = protocol.get(url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                const redirectUrl = response.headers.location
                if (redirectUrl) {
                    downloadFile(redirectUrl, destPath).then(resolve)
                    return
                }
            }

            // Handle expired URLs (410 Gone)
            if (response.statusCode === 410) {
                resolve({ success: false, statusCode: 410, error: 'URL expired (Gone)' })
                return
            }

            // Handle other errors
            if (response.statusCode !== 200) {
                resolve({
                    success: false,
                    statusCode: response.statusCode,
                    error: `HTTP ${response.statusCode}: ${response.statusMessage}`
                })
                return
            }

            const chunks: Buffer[] = []
            response.on('data', (chunk) => chunks.push(chunk))
            response.on('end', async () => {
                try {
                    const buffer = Buffer.concat(chunks)
                    await fs.writeFile(destPath, buffer)
                    resolve({ success: true })
                } catch (err) {
                    resolve({
                        success: false,
                        error: err instanceof Error ? err.message : 'Write failed'
                    })
                }
            })
            response.on('error', (err) => {
                resolve({ success: false, error: err.message })
            })
        })

        request.on('error', (err) => {
            resolve({ success: false, error: err.message })
        })
        request.on('timeout', () => {
            request.destroy()
            resolve({ success: false, error: 'Request timeout' })
        })
    })
}

// POST: Download media from WhatsApp URL and store locally
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as DownloadRequest
        const { url, messageId, filename } = body

        if (!url || !messageId) {
            return NextResponse.json(
                { code: 'ERROR', message: 'url and messageId are required' },
                { status: 400 }
            )
        }

        // Check if this download previously failed
        const failedEntry = failedDownloads.get(messageId)
        if (failedEntry) {
            const age = Date.now() - failedEntry.timestamp
            if (age < FAILED_CACHE_TTL) {
                // Return cached failure without retrying
                return NextResponse.json({
                    code: 'EXPIRED',
                    message: failedEntry.error,
                    results: { expired: true }
                })
            } else {
                // Clear old entry
                failedDownloads.delete(messageId)
            }
        }

        // Ensure media directory exists
        await fs.mkdir(MEDIA_DIR, { recursive: true })

        // Determine file extension from URL or filename
        let ext = '.bin'
        if (filename) {
            ext = path.extname(filename) || ext
        } else {
            // Try to get extension from URL path
            try {
                const urlPath = new URL(url).pathname
                const urlExt = path.extname(urlPath.split('?')[0])
                if (urlExt) ext = urlExt
            } catch {
                // Invalid URL, use default
            }
        }

        // Clean the extension
        if (ext === '.enc') {
            // WhatsApp encrypted files - guess from URL pattern
            if (url.includes('t62.7118') || url.includes('t24/f2') || url.includes('o1/v/t24')) ext = '.jpg'
            else if (url.includes('t62.7161')) ext = '.mp4'
            else if (url.includes('t62.7119')) ext = '.pdf'
            else if (url.includes('t62.7117')) ext = '.ogg'
            else if (url.includes('audio')) ext = '.ogg'
        }

        const localFilename = `${messageId}${ext}`
        const localPath = path.join(MEDIA_DIR, localFilename)

        // Check if already downloaded
        try {
            await fs.access(localPath)
            // File already exists
            return NextResponse.json({
                code: 'SUCCESS',
                results: {
                    localPath: `/api/media/${localFilename}`,
                    filename: localFilename,
                    cached: true
                }
            })
        } catch {
            // File doesn't exist, download it
        }

        console.log(`[Media Download] Downloading ${messageId}...`)
        const result = await downloadFile(url, localPath)

        if (!result.success) {
            // Cache the failure to avoid repeated attempts
            failedDownloads.set(messageId, {
                timestamp: Date.now(),
                error: result.error || 'Download failed'
            })

            // Clean up old entries periodically
            if (failedDownloads.size > 1000) {
                const now = Date.now()
                const entries = Array.from(failedDownloads.entries())
                for (const [key, value] of entries) {
                    if (now - value.timestamp > FAILED_CACHE_TTL) {
                        failedDownloads.delete(key)
                    }
                }
            }

            // Return appropriate response based on error type
            if (result.statusCode === 410) {
                return NextResponse.json({
                    code: 'EXPIRED',
                    message: 'Media URL has expired',
                    results: { expired: true }
                })
            }

            return NextResponse.json({
                code: 'DOWNLOAD_FAILED',
                message: result.error || 'Download failed',
                results: { expired: false }
            })
        }

        const stats = await fs.stat(localPath)
        console.log(`[Media Download] Saved ${localFilename} (${stats.size} bytes)`)

        return NextResponse.json({
            code: 'SUCCESS',
            results: {
                localPath: `/api/media/${localFilename}`,
                filename: localFilename,
                size: stats.size,
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
