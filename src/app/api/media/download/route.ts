import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import https from 'https'
import http from 'http'

export const dynamic = 'force-dynamic'

const MEDIA_DIR = process.env.MEDIA_DIR || '/app/uploads/media'

interface DownloadRequest {
    url: string
    messageId: string
    filename?: string
}

// Download a file from URL and save locally
async function downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
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
                    downloadFile(redirectUrl, destPath).then(resolve).catch(reject)
                    return
                }
            }

            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
                return
            }

            const chunks: Buffer[] = []
            response.on('data', (chunk) => chunks.push(chunk))
            response.on('end', async () => {
                try {
                    const buffer = Buffer.concat(chunks)
                    await fs.writeFile(destPath, buffer)
                    resolve()
                } catch (err) {
                    reject(err)
                }
            })
            response.on('error', reject)
        })

        request.on('error', reject)
        request.on('timeout', () => {
            request.destroy()
            reject(new Error('Request timeout'))
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

        // Ensure media directory exists
        await fs.mkdir(MEDIA_DIR, { recursive: true })

        // Determine file extension from URL or filename
        let ext = '.bin'
        if (filename) {
            ext = path.extname(filename) || ext
        } else {
            // Try to get extension from URL path
            const urlPath = new URL(url).pathname
            const urlExt = path.extname(urlPath.split('?')[0])
            if (urlExt) ext = urlExt
        }

        // Clean the extension
        if (ext === '.enc') {
            // WhatsApp encrypted files - guess from URL pattern
            if (url.includes('t62.7118') || url.includes('t24/f2')) ext = '.jpg'
            else if (url.includes('t62.7161')) ext = '.mp4'
            else if (url.includes('t62.7119')) ext = '.pdf'
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

        console.log(`[Media Download] Downloading ${messageId} from ${url.substring(0, 50)}...`)
        await downloadFile(url, localPath)

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
        console.error('Error downloading media:', error)
        const message = error instanceof Error ? error.message : 'Failed to download media'
        return NextResponse.json(
            { code: 'ERROR', message },
            { status: 500 }
        )
    }
}
