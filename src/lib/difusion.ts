import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { CookieJar } from 'tough-cookie'
import { promisify } from 'util'

const DIFUSION_URL = process.env.NEXT_PUBLIC_DIFUSION_URL || 'https://difusion.naperu.cloud'
const DIFUSION_USER = process.env.DIFUSION_USER || 'admin'
const DIFUSION_PASS = process.env.DIFUSION_PASS || 'c2rfoitp1ennzsfsdfsdlkl79mg3rstydwels'

// Cookie Jar for session persistence
const cookieJar = new CookieJar()
const getCookieString = promisify(cookieJar.getCookieString.bind(cookieJar))
const setCookie = promisify(cookieJar.setCookie.bind(cookieJar))

// Cliente para uso en el servidor (con credenciales)
export const difusionServer = axios.create({
  baseURL: DIFUSION_URL,
  auth: {
    username: DIFUSION_USER,
    password: DIFUSION_PASS,
  },
  headers: {
    'Content-Type': 'application/json',
  },
})

// Helper to create request with device ID header
export function withDeviceId(deviceId: string): AxiosInstance {
  const instance = axios.create({
    baseURL: DIFUSION_URL,
    auth: {
      username: DIFUSION_USER,
      password: DIFUSION_PASS,
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': deviceId,
    },
  })
  
  // Copy interceptors
  instance.interceptors.request.use(async (request: InternalAxiosRequestConfig) => {
    const url = request.url ? new URL(request.url, DIFUSION_URL).toString() : DIFUSION_URL
    try {
      const cookieHeader = await getCookieString(url)
      if (cookieHeader) {
        request.headers.set('Cookie', cookieHeader)
      }
    } catch (err) {
      console.error('Error getting cookies:', err)
    }
    console.log(`[Difusion Request] ${request.method?.toUpperCase()} ${request.url} [Device: ${deviceId}]`)
    return request
  })
  
  return instance
}

// Debug and Cookie interceptors
difusionServer.interceptors.request.use(async request => {
  // Inject cookies
  const url = request.url ? new URL(request.url, DIFUSION_URL).toString() : DIFUSION_URL
  try {
    const cookieHeader = await getCookieString(url)
    if (cookieHeader) {
      request.headers.set('Cookie', cookieHeader)
    }
  } catch (err) {
    console.error('Error getting cookies:', err)
  }

  console.log(`[Difusion Request] ${request.method?.toUpperCase()} ${request.url}`)
  return request
})

difusionServer.interceptors.response.use(
  async response => {
    // Only log body for status or relevant endpoints to avoid noise
    if (response.config.url?.includes('/app/status') || response.config.url?.includes('/login')) {
      console.log(`[Difusion Response Body] ${JSON.stringify(response.data)}`)
    }

    console.log(`[Difusion Response] ${response.status} ${response.config.url}`)

    // Store cookies
    const setCookieHeader = response.headers['set-cookie']
    if (setCookieHeader) {
      console.log('[Difusion Cookie] Received Set-Cookie:', setCookieHeader)
      const url = response.config.url ? new URL(response.config.url, DIFUSION_URL).toString() : DIFUSION_URL

      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]

      for (const cookie of cookies) {
        if (typeof cookie === 'string') {
          try {
            await setCookie(cookie, url)
          } catch (err) {
            console.error('Error setting cookie:', err)
          }
        }
      }
    }
    return response
  },
  error => {
    if (error.response) {
      console.error(`[Difusion Error] ${error.response.status} ${error.config.url}`)
    }
    return Promise.reject(error)
  }
)

// Tipos
export interface DifusionResponse<T> {
  code: string
  message: string
  results: T
  status?: number
}

export interface Device {
  name: string
  device: string
}

export interface ConnectionStatus {
  device_id: string
  is_connected: boolean
  is_logged_in: boolean
}

export interface LoginResponse {
  device_id: string
  qr_link: string
  qr_duration: number
}

export interface Chat {
  jid: string
  name: string
  last_message_time: string
  ephemeral_expiration: number
  created_at: string
  updated_at: string
}

export interface ChatListResponse {
  data: Chat[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export interface Message {
  id: string
  chat_jid: string
  sender_jid: string
  content: string
  timestamp: string
  is_from_me: boolean
  media_type: string
  filename: string
  url: string
  file_length: number
  created_at: string
  updated_at: string
}

export interface MessagesResponse {
  data: Message[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
  chat_info: Chat
}

export interface Contact {
  jid: string
  name: string
}

export interface ContactsResponse {
  data: Contact[]
}

export interface SendMessageResponse {
  message_id: string
  status: string
}

// ============================================
// API v8 Multi-Device Types
// ============================================

export interface DeviceV8 {
  id: string
  jid: string
  display_name: string
  state: 'connected' | 'disconnected' | 'connecting'
  created_at: string
}

export interface DeviceCreateResponse {
  id: string
  jid: string
  display_name: string
  state: string
  created_at: string
}

export interface DeviceLoginResponse {
  qr_link: string
  qr_duration: number
  code?: string
}

export interface DeviceStatusResponse {
  device_id: string
  is_connected: boolean
  is_logged_in: boolean
  jid?: string
  display_name?: string
}

// ============================================
// API v8 Multi-Device Helpers
// ============================================

export const DevicesAPI = {
  // List all devices
  list: async () => {
    const response = await difusionServer.get<DifusionResponse<DeviceV8[] | null>>('/devices')
    return response.data
  },

  // Create new device
  create: async (name: string) => {
    const response = await difusionServer.post<DifusionResponse<DeviceCreateResponse>>('/devices', { name })
    return response.data
  },

  // Get device info
  get: async (deviceId: string) => {
    const response = await difusionServer.get<DifusionResponse<DeviceV8>>(`/devices/${deviceId}`)
    return response.data
  },

  // Delete device
  delete: async (deviceId: string) => {
    const response = await difusionServer.delete<DifusionResponse<null>>(`/devices/${deviceId}`)
    return response.data
  },

  // Get login QR for device
  login: async (deviceId: string) => {
    // Use /app/login with X-Device-Id header (v8 API)
    const client = withDeviceId(deviceId)
    const response = await client.get<DifusionResponse<DeviceLoginResponse>>('/app/login')
    return response.data
  },

  // Logout device
  logout: async (deviceId: string) => {
    const response = await difusionServer.post<DifusionResponse<null>>(`/devices/${deviceId}/logout`)
    return response.data
  },

  // Get device status
  status: async (deviceId: string) => {
    // Use /app/status with X-Device-Id header (v8 API)
    const client = withDeviceId(deviceId)
    const response = await client.get<DifusionResponse<DeviceStatusResponse>>('/app/status')
    return response.data
  },

  // Reconnect device
  reconnect: async (deviceId: string) => {
    const response = await difusionServer.post<DifusionResponse<null>>(`/devices/${deviceId}/reconnect`)
    return response.data
  }
}
