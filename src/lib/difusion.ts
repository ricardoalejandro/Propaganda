/**
 * Cliente API para difusion.naperu.cloud (go-whatsapp-web-multidevice)
 * 
 * Documentación: La API usa:
 * - GET con query params para /app/* endpoints
 * - POST con JSON body para /send/* endpoints
 */

const DIFUSION_URL = process.env.DIFUSION_URL || 'https://difusion.naperu.cloud'
const DIFUSION_USER = process.env.DIFUSION_USER || 'admin'
const DIFUSION_PASSWORD = process.env.DIFUSION_PASSWORD || ''

// Basic Auth header
const getAuthHeader = () => {
  const credentials = Buffer.from(`${DIFUSION_USER}:${DIFUSION_PASSWORD}`).toString('base64')
  return `Basic ${credentials}`
}

// Helper para hacer requests GET
async function difusionGet<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${DIFUSION_URL}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Difusion API Error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Helper para hacer requests POST
async function difusionPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const url = `${DIFUSION_URL}${endpoint}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Difusion API Error: ${response.status} - ${error}`)
  }

  return response.json()
}

// ============================================
// TIPOS
// ============================================

export interface DifusionDevice {
  name: string
  device: string
}

export interface DifusionResponse<T = unknown> {
  code: string
  message: string
  results?: T
}

export interface DifusionQRResult {
  qr_link: string
  qr_duration: number
}

export interface SendMessageResult {
  message_id: string
  status: string
}

// ============================================
// DISPOSITIVOS / APP
// ============================================

/**
 * Listar todos los dispositivos conectados
 * GET /app/devices
 */
export async function listDevices(): Promise<DifusionDevice[]> {
  const response = await difusionGet<DifusionResponse<DifusionDevice[]>>('/app/devices')
  return response.results || []
}

/**
 * Login / Obtener QR para conectar un dispositivo
 * GET /app/login?phone={phone}
 * 
 * El "phone" actúa como device_id único
 */
export async function loginDevice(phone: string): Promise<DifusionQRResult> {
  const response = await difusionGet<DifusionResponse<DifusionQRResult>>('/app/login', { phone })
  if (!response.results) {
    throw new Error('No QR returned from API')
  }
  return response.results
}

/**
 * Logout de un dispositivo
 * GET /app/logout?phone={phone}
 */
export async function logoutDevice(phone: string): Promise<void> {
  await difusionGet<DifusionResponse>('/app/logout', { phone })
}

/**
 * Reconectar un dispositivo
 * GET /app/reconnect?phone={phone}
 */
export async function reconnectDevice(phone: string): Promise<void> {
  await difusionGet<DifusionResponse>('/app/reconnect', { phone })
}

// ============================================
// ENVÍO DE MENSAJES
// ============================================

/**
 * Enviar mensaje de texto
 * POST /send/message
 */
export async function sendMessage(
  phone: string,
  message: string,
  replyMessageId?: string
): Promise<SendMessageResult> {
  const body: Record<string, unknown> = { phone, message }
  if (replyMessageId) {
    body.reply_message_id = replyMessageId
  }
  
  const response = await difusionPost<DifusionResponse<SendMessageResult>>('/send/message', body)
  return response.results || { message_id: '', status: 'sent' }
}

/**
 * Enviar imagen
 * POST /send/image
 */
export async function sendImage(
  phone: string,
  imageUrl: string,
  caption?: string
): Promise<SendMessageResult> {
  const body: Record<string, unknown> = { phone, image: imageUrl }
  if (caption) {
    body.caption = caption
  }
  
  const response = await difusionPost<DifusionResponse<SendMessageResult>>('/send/image', body)
  return response.results || { message_id: '', status: 'sent' }
}

/**
 * Enviar documento/archivo
 * POST /send/file
 */
export async function sendDocument(
  phone: string,
  fileUrl: string,
  filename?: string
): Promise<SendMessageResult> {
  const body: Record<string, unknown> = { phone, document: fileUrl }
  if (filename) {
    body.filename = filename
  }
  
  const response = await difusionPost<DifusionResponse<SendMessageResult>>('/send/file', body)
  return response.results || { message_id: '', status: 'sent' }
}

/**
 * Enviar audio
 * POST /send/audio
 */
export async function sendAudio(
  phone: string,
  audioUrl: string
): Promise<SendMessageResult> {
  const response = await difusionPost<DifusionResponse<SendMessageResult>>('/send/audio', {
    phone,
    audio: audioUrl,
  })
  return response.results || { message_id: '', status: 'sent' }
}

/**
 * Enviar video
 * POST /send/video
 */
export async function sendVideo(
  phone: string,
  videoUrl: string,
  caption?: string
): Promise<SendMessageResult> {
  const body: Record<string, unknown> = { phone, video: videoUrl }
  if (caption) {
    body.caption = caption
  }
  
  const response = await difusionPost<DifusionResponse<SendMessageResult>>('/send/video', body)
  return response.results || { message_id: '', status: 'sent' }
}

/**
 * Enviar ubicación
 * POST /send/location
 */
export async function sendLocation(
  phone: string,
  latitude: number,
  longitude: number,
  name?: string
): Promise<SendMessageResult> {
  const body: Record<string, unknown> = { phone, latitude, longitude }
  if (name) {
    body.name = name
  }
  
  const response = await difusionPost<DifusionResponse<SendMessageResult>>('/send/location', body)
  return response.results || { message_id: '', status: 'sent' }
}

// ============================================
// WEBHOOKS / MENSAJES RECIBIDOS
// ============================================

export interface WebhookMessage {
  message_id: string
  phone: string
  device?: string
  sender: string
  message: string
  reply_to?: string
  pushname?: string
  timestamp?: number
  type?: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact'
  media_url?: string
}

/**
 * Parsear webhook de mensaje recibido
 */
export function parseWebhookMessage(body: unknown): WebhookMessage | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  const data = body as Record<string, unknown>
  
  return {
    message_id: String(data.message_id || data.id || ''),
    phone: String(data.phone || data.from || ''),
    device: data.device ? String(data.device) : undefined,
    sender: String(data.sender || data.from || ''),
    message: String(data.message || data.body || data.text || ''),
    reply_to: data.reply_to ? String(data.reply_to) : undefined,
    pushname: data.pushname ? String(data.pushname) : undefined,
    timestamp: data.timestamp ? Number(data.timestamp) : Date.now(),
    type: data.type as WebhookMessage['type'] || 'text',
    media_url: data.media_url ? String(data.media_url) : undefined,
  }
}
