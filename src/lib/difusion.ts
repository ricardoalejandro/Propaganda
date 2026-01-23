/**
 * Cliente API para difusion.naperu.cloud (go-whatsapp-web-multidevice)
 */

const DIFUSION_URL = process.env.DIFUSION_URL || 'https://difusion.naperu.cloud'
const DIFUSION_USER = process.env.DIFUSION_USER || 'admin'
const DIFUSION_PASSWORD = process.env.DIFUSION_PASSWORD || ''

// Basic Auth header
const getAuthHeader = () => {
  const credentials = Buffer.from(`${DIFUSION_USER}:${DIFUSION_PASSWORD}`).toString('base64')
  return `Basic ${credentials}`
}

// Helper para hacer requests
async function difusionFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${DIFUSION_URL}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
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
  device_id: string
  display_name: string
  jid: string
  created_at: string
  updated_at: string
}

export interface DifusionQRResponse {
  code: string
  message: string
  results: {
    qr_link: string
    qr_duration: number
  }
}

export interface DifusionStatusResponse {
  code: string
  message: string
  results: {
    is_logged_in: boolean
    phone_number?: string
    push_name?: string
  }
}

export interface SendMessageRequest {
  phone: string
  message: string
  reply_message_id?: string
}

export interface SendMessageResponse {
  code: string
  message: string
  results: {
    message_id: string
    status: string
  }
}

// ============================================
// DISPOSITIVOS
// ============================================

/**
 * Listar todos los dispositivos
 */
export async function listDevices(): Promise<DifusionDevice[]> {
  const response = await difusionFetch<{ code: string; results: DifusionDevice[] }>('/devices')
  return response.results || []
}

/**
 * Agregar un nuevo dispositivo
 */
export async function addDevice(displayName?: string): Promise<DifusionDevice> {
  const response = await difusionFetch<{ code: string; results: DifusionDevice }>('/devices', {
    method: 'POST',
    body: JSON.stringify({ display_name: displayName || 'Nueva cuenta' }),
  })
  return response.results
}

/**
 * Obtener info de un dispositivo
 */
export async function getDevice(deviceId: string): Promise<DifusionDevice> {
  const response = await difusionFetch<{ code: string; results: DifusionDevice }>(
    `/devices/${encodeURIComponent(deviceId)}`
  )
  return response.results
}

/**
 * Eliminar un dispositivo
 */
export async function deleteDevice(deviceId: string): Promise<void> {
  await difusionFetch(`/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
  })
}

/**
 * Obtener QR para login
 */
export async function getDeviceQR(deviceId: string): Promise<DifusionQRResponse> {
  return difusionFetch<DifusionQRResponse>(
    `/devices/${encodeURIComponent(deviceId)}/login`
  )
}

/**
 * Logout de un dispositivo
 */
export async function logoutDevice(deviceId: string): Promise<void> {
  await difusionFetch(`/devices/${encodeURIComponent(deviceId)}/logout`, {
    method: 'POST',
  })
}

/**
 * Reconectar un dispositivo
 */
export async function reconnectDevice(deviceId: string): Promise<void> {
  await difusionFetch(`/devices/${encodeURIComponent(deviceId)}/reconnect`, {
    method: 'POST',
  })
}

/**
 * Obtener estado de un dispositivo
 */
export async function getDeviceStatus(deviceId: string): Promise<DifusionStatusResponse> {
  return difusionFetch<DifusionStatusResponse>(
    `/devices/${encodeURIComponent(deviceId)}/status`
  )
}

// ============================================
// MENSAJES
// ============================================

/**
 * Enviar mensaje de texto
 */
export async function sendMessage(
  deviceId: string,
  phone: string,
  message: string,
  replyMessageId?: string
): Promise<SendMessageResponse> {
  return difusionFetch<SendMessageResponse>('/send/message', {
    method: 'POST',
    headers: {
      'X-Device-Id': deviceId,
    },
    body: JSON.stringify({
      phone,
      message,
      reply_message_id: replyMessageId,
    }),
  })
}

/**
 * Enviar imagen
 */
export async function sendImage(
  deviceId: string,
  phone: string,
  imageUrl: string,
  caption?: string
): Promise<SendMessageResponse> {
  return difusionFetch<SendMessageResponse>('/send/image', {
    method: 'POST',
    headers: {
      'X-Device-Id': deviceId,
    },
    body: JSON.stringify({
      phone,
      image: imageUrl,
      caption,
    }),
  })
}

/**
 * Enviar documento
 */
export async function sendDocument(
  deviceId: string,
  phone: string,
  documentUrl: string,
  filename?: string,
  caption?: string
): Promise<SendMessageResponse> {
  return difusionFetch<SendMessageResponse>('/send/document', {
    method: 'POST',
    headers: {
      'X-Device-Id': deviceId,
    },
    body: JSON.stringify({
      phone,
      document: documentUrl,
      filename,
      caption,
    }),
  })
}

/**
 * Enviar audio
 */
export async function sendAudio(
  deviceId: string,
  phone: string,
  audioUrl: string
): Promise<SendMessageResponse> {
  return difusionFetch<SendMessageResponse>('/send/audio', {
    method: 'POST',
    headers: {
      'X-Device-Id': deviceId,
    },
    body: JSON.stringify({
      phone,
      audio: audioUrl,
    }),
  })
}

/**
 * Enviar video
 */
export async function sendVideo(
  deviceId: string,
  phone: string,
  videoUrl: string,
  caption?: string
): Promise<SendMessageResponse> {
  return difusionFetch<SendMessageResponse>('/send/video', {
    method: 'POST',
    headers: {
      'X-Device-Id': deviceId,
    },
    body: JSON.stringify({
      phone,
      video: videoUrl,
      caption,
    }),
  })
}

/**
 * Enviar ubicación
 */
export async function sendLocation(
  deviceId: string,
  phone: string,
  latitude: number,
  longitude: number,
  name?: string
): Promise<SendMessageResponse> {
  return difusionFetch<SendMessageResponse>('/send/location', {
    method: 'POST',
    headers: {
      'X-Device-Id': deviceId,
    },
    body: JSON.stringify({
      phone,
      latitude,
      longitude,
      name,
    }),
  })
}

/**
 * Marcar mensaje como leído
 */
export async function markMessageRead(
  deviceId: string,
  messageId: string
): Promise<void> {
  await difusionFetch(`/message/${encodeURIComponent(messageId)}/read`, {
    method: 'POST',
    headers: {
      'X-Device-Id': deviceId,
    },
  })
}

// ============================================
// USUARIO
// ============================================

/**
 * Obtener info del usuario conectado
 */
export async function getUserInfo(deviceId: string) {
  return difusionFetch<{
    code: string
    results: {
      phone_number: string
      push_name: string
      platform: string
    }
  }>('/user/info', {
    headers: {
      'X-Device-Id': deviceId,
    },
  })
}

/**
 * Obtener contactos
 */
export async function getContacts(deviceId: string) {
  return difusionFetch<{
    code: string
    results: Array<{
      jid: string
      name: string
      notify: string
    }>
  }>('/user/my/contacts', {
    headers: {
      'X-Device-Id': deviceId,
    },
  })
}

// ============================================
// CHATS
// ============================================

/**
 * Obtener lista de chats
 */
export async function getChats(deviceId: string, limit = 50, offset = 0) {
  return difusionFetch<{
    code: string
    results: Array<{
      jid: string
      name: string
      last_message_time: string
      unread_count: number
    }>
  }>(`/chats?limit=${limit}&offset=${offset}`, {
    headers: {
      'X-Device-Id': deviceId,
    },
  })
}

/**
 * Obtener mensajes de un chat
 */
export async function getChatMessages(
  deviceId: string,
  chatJid: string,
  limit = 50
) {
  return difusionFetch<{
    code: string
    results: Array<{
      id: string
      chat_jid: string
      sender: string
      content: string
      timestamp: string
      is_from_me: boolean
      media_type?: string
      filename?: string
    }>
  }>(`/chat/${encodeURIComponent(chatJid)}/messages?limit=${limit}`, {
    headers: {
      'X-Device-Id': deviceId,
    },
  })
}

export default {
  listDevices,
  addDevice,
  getDevice,
  deleteDevice,
  getDeviceQR,
  logoutDevice,
  reconnectDevice,
  getDeviceStatus,
  sendMessage,
  sendImage,
  sendDocument,
  sendAudio,
  sendVideo,
  sendLocation,
  markMessageRead,
  getUserInfo,
  getContacts,
  getChats,
  getChatMessages,
}
