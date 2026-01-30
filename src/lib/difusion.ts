import axios from 'axios'
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
