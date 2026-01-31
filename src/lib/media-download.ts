import fs from 'fs/promises'
import path from 'path'

const MEDIA_DIR = process.env.MEDIA_DIR || '/app/uploads/media'
const DIFUSION_URL = process.env.NEXT_PUBLIC_DIFUSION_URL || 'https://difusion.naperu.cloud'
const DIFUSION_USER = process.env.DIFUSION_USER || 'admin'
const DIFUSION_PASS = process.env.DIFUSION_PASS || ''

interface DifusionMediaResponse {
    code: string
    message: string
    results?: {
        message_id: string
        status: string
        media_type: string
        filename: string
        file_path: string  // Path on Difusion server (e.g., "statics/media/...")
    }
}

/**
 * Download media from WhatsApp via Difusion API proxy
 * Uses the /message/{id}/download endpoint which decrypts and stores the file on Difusion
 * Then downloads the actual file from Difusion's statics path
 * Returns the local URL path if successful
 */
export async function downloadMedia(
    url: string,
    messageId: string,
    mediaType: string,
    jid?: string  // New: phone/chat JID for the download API
): Promise<string | null> {
    if (!messageId) return null

    try {
        // Ensure media directory exists
        await fs.mkdir(MEDIA_DIR, { recursive: true })

        // Determine file extension based on media type
        let extension = 'bin'
        if (mediaType === 'image') extension = 'jpg'
        else if (mediaType === 'video') extension = 'mp4'
        else if (mediaType === 'audio') extension = 'ogg'
        else if (mediaType === 'ptt') extension = 'ogg'
        else if (mediaType === 'sticker') extension = 'webp'
        else if (mediaType === 'document') {
            // Try to extract from URL if available
            try {
                const urlPath = new URL(url).pathname
                const ext = path.extname(urlPath)
                if (ext) extension = ext.slice(1)
            } catch {
                extension = 'bin'
            }
        }

        const filename = `${messageId}.${extension}`
        const filepath = path.join(MEDIA_DIR, filename)

        // Check if already downloaded and valid
        try {
            await fs.access(filepath)
            const buffer = await fs.readFile(filepath)
            if (buffer.length > 10) {
                // For JPEG, check magic bytes (ff d8 ff)
                if (extension === 'jpg' && buffer[0] === 0xff && buffer[1] === 0xd8) {
                    console.log(`[Media] Already exists and valid: ${filename}`)
                    return `/api/media/${messageId}`
                }
                // For MP4, check for ftyp box
                if (extension === 'mp4' && buffer.slice(4, 8).toString() === 'ftyp') {
                    console.log(`[Media] Already exists and valid: ${filename}`)
                    return `/api/media/${messageId}`
                }
                // For other types, just check it's not empty
                if (extension !== 'jpg' && extension !== 'mp4') {
                    console.log(`[Media] Already exists: ${filename}`)
                    return `/api/media/${messageId}`
                }
            }
            // File exists but is invalid, delete and re-download
            console.log(`[Media] File exists but appears invalid, re-downloading: ${filename}`)
            await fs.unlink(filepath)
        } catch {
            // File doesn't exist, download it
        }

        // If no JID provided, we can't use the Difusion proxy API
        if (!jid) {
            console.error(`[Media] No JID provided for ${messageId}, cannot download`)
            return null
        }

        const authHeader = 'Basic ' + Buffer.from(`${DIFUSION_USER}:${DIFUSION_PASS}`).toString('base64')

        console.log(`[Media] Downloading via Difusion API: ${messageId}`)

        // Step 1: Call Difusion API to trigger decryption and get file path
        const downloadUrl = `${DIFUSION_URL}/message/${messageId}/download?phone=${encodeURIComponent(jid)}`

        const response = await fetch(downloadUrl, {
            headers: { 'Authorization': authHeader }
        })

        if (!response.ok) {
            console.error(`[Media] Difusion API failed: ${response.status} ${response.statusText}`)
            return null
        }

        const data: DifusionMediaResponse = await response.json()

        if (data.code !== 'SUCCESS' || !data.results?.file_path) {
            console.error(`[Media] Download failed: ${data.message}`)
            return null
        }

        // Step 2: Download the actual file from Difusion's statics path
        const fileUrl = `${DIFUSION_URL}/${data.results.file_path}`
        console.log(`[Media] Fetching file from: ${fileUrl}`)

        const fileResponse = await fetch(fileUrl, {
            headers: { 'Authorization': authHeader }
        })

        if (!fileResponse.ok) {
            console.error(`[Media] File fetch failed: ${fileResponse.status}`)
            return null
        }

        const mediaBuffer = Buffer.from(await fileResponse.arrayBuffer())

        // Update extension based on actual content if needed
        if (mediaBuffer[0] === 0xff && mediaBuffer[1] === 0xd8) {
            extension = 'jpg'
        } else if (mediaBuffer.slice(4, 8).toString() === 'ftyp') {
            extension = 'mp4'
        }

        const finalFilename = `${messageId}.${extension}`
        const finalFilepath = path.join(MEDIA_DIR, finalFilename)

        await fs.writeFile(finalFilepath, mediaBuffer)
        console.log(`[Media] Downloaded: ${finalFilename} (${mediaBuffer.length} bytes)`)

        return `/api/media/${messageId}`

    } catch (err) {
        console.error(`[Media] Error downloading ${messageId}:`, err)
        return null
    }
}


/**
 * Get media file info
 */
export async function getMediaPath(messageId: string): Promise<string | null> {
    try {
        const files = await fs.readdir(MEDIA_DIR)
        const file = files.find(f => f.startsWith(messageId))
        if (file) {
            return path.join(MEDIA_DIR, file)
        }
        return null
    } catch {
        return null
    }
}

/**
 * Delete media file
 */
export async function deleteMedia(messageId: string): Promise<boolean> {
    try {
        const filepath = await getMediaPath(messageId)
        if (filepath) {
            await fs.unlink(filepath)
            return true
        }
        return false
    } catch {
        return false
    }
}
