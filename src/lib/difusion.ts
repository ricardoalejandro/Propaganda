import axios from 'axios'

const DIFUSION_URL = process.env.NEXT_PUBLIC_DIFUSION_URL || 'https://difusion.naperu.cloud'
const DIFUSION_USER = process.env.DIFUSION_USER || 'admin'
const DIFUSION_PASS = process.env.DIFUSION_PASS || 'c2rfoitp1ennzsfsdfsdlkl79mg3rstydwels'

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
