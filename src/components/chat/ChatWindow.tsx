"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Message, Chat, Contact } from "@/lib/difusion"
import { MessageBubble } from "./MessageBubble"
import { ChatInput } from "./ChatInput"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { formatPhone, isGroup } from "@/lib/utils"
import { Loader2, ArrowLeft, Users, Info } from "lucide-react"
import { LeadDetailsPanel } from "./LeadDetailsPanel"

interface ChatWindowProps {
  chat: Chat
  contacts: Contact[]
  onBack?: () => void
  isConnected?: boolean
}

export function ChatWindow({ chat, contacts, onBack, isConnected = true }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const isInitialLoad = useRef(true)
  const [showLeadPanel, setShowLeadPanel] = useState(false)

  // Get chat name
  const contactMap = new Map(contacts.map(c => [c.jid, c.name]))
  const getChatName = () => {
    if (chat.name && chat.name !== chat.jid.split('@')[0]) {
      return chat.name
    }
    const contactName = contactMap.get(chat.jid)
    if (contactName) return contactName
    return formatPhone(chat.jid)
  }

  // Check if user is near bottom of messages
  const checkIfNearBottom = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return true

    const threshold = 150 // pixels from bottom
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    return distanceFromBottom < threshold
  }, [])

  // Handle scroll events
  const handleScroll = useCallback(() => {
    setShouldAutoScroll(checkIfNearBottom())
  }, [checkIfNearBottom])

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(chat.jid)}/messages`, { cache: 'no-store' })
      const data = await response.json()
      if (data.results?.data) {
        // Sort messages by timestamp ascending
        const sortedMessages = [...data.results.data].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        setMessages(sortedMessages)
      }
    } catch (err) {
      console.error("Error fetching messages:", err)
    } finally {
      setLoading(false)
    }
  }, [chat.jid])

  // Fetch messages on mount and periodically
  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  // Scroll to bottom only when appropriate
  // Scroll to bottom only when appropriate
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || messages.length === 0) return

    if (isInitialLoad.current) {
      // Always scroll on initial load (instant)
      container.scrollTop = container.scrollHeight
      isInitialLoad.current = false
    } else if (shouldAutoScroll) {
      // Auto-scroll if user was at bottom
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      })
    }
  }, [messages, shouldAutoScroll])

  // Reset initial load flag when chat changes
  useEffect(() => {
    isInitialLoad.current = true
    setShouldAutoScroll(true)
    setLoading(true)
    setMessages([])
  }, [chat.jid])

  // Get phone number from JID
  const getPhone = () => chat.jid.split('@')[0]

  // Send text message
  const handleSendMessage = async (message: string) => {
    setSending(true)
    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: getPhone(), message }),
      })
      const data = await response.json()
      if (data.code === "SUCCESS") {
        setShouldAutoScroll(true)
        await fetchMessages()
      } else {
        console.error("Error sending:", data.message)
        alert(`Error: ${data.message || 'No se pudo enviar el mensaje'}`)
      }
    } catch (err) {
      console.error("Error sending message:", err)
      alert("Error de conexión al enviar mensaje")
    } finally {
      setSending(false)
    }
  }

  // Send image
  const handleSendImage = async (file: File, caption?: string) => {
    setSending(true)
    try {
      const formData = new FormData()
      formData.append('phone', getPhone())
      formData.append('image', file)
      if (caption) formData.append('caption', caption)

      const response = await fetch("/api/send/image", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (data.code === "SUCCESS") {
        setShouldAutoScroll(true)
        await fetchMessages()
      } else {
        console.error("Error sending image:", data.message)
        alert(`Error: ${data.message || 'No se pudo enviar la imagen'}`)
      }
    } catch (err) {
      console.error("Error sending image:", err)
      alert("Error de conexión al enviar imagen")
    } finally {
      setSending(false)
    }
  }

  // Send file
  const handleSendFile = async (file: File) => {
    setSending(true)
    try {
      const formData = new FormData()
      formData.append('phone', getPhone())
      formData.append('file', file)

      const response = await fetch("/api/send/file", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (data.code === "SUCCESS") {
        setShouldAutoScroll(true)
        await fetchMessages()
      } else {
        console.error("Error sending file:", data.message)
        alert(`Error: ${data.message || 'No se pudo enviar el archivo'}`)
      }
    } catch (err) {
      console.error("Error sending file:", err)
      alert("Error de conexión al enviar archivo")
    } finally {
      setSending(false)
    }
  }

  // Send audio
  const handleSendAudio = async (blob: Blob) => {
    setSending(true)
    try {
      const formData = new FormData()
      formData.append('phone', getPhone())
      formData.append('audio', blob, 'voice-note.ogg')

      const response = await fetch("/api/send/audio", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (data.code === "SUCCESS") {
        setShouldAutoScroll(true)
        await fetchMessages()
      } else {
        console.error("Error sending audio:", data.message)
        alert(`Error: ${data.message || 'No se pudo enviar el audio'}`)
      }
    } catch (err) {
      console.error("Error sending audio:", err)
      alert("Error de conexión al enviar audio")
    } finally {
      setSending(false)
    }
  }

  // Send video
  const handleSendVideo = async (file: File, caption?: string) => {
    setSending(true)
    try {
      const formData = new FormData()
      formData.append('phone', getPhone())
      formData.append('video', file)
      if (caption) formData.append('caption', caption)

      const response = await fetch("/api/send/video", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (data.code === "SUCCESS") {
        setShouldAutoScroll(true)
        await fetchMessages()
      } else {
        console.error("Error sending video:", data.message)
        alert(`Error: ${data.message || 'No se pudo enviar el video'}`)
      }
    } catch (err) {
      console.error("Error sending video:", err)
      alert("Error de conexión al enviar video")
    } finally {
      setSending(false)
    }
  }

  const isGroupChat = isGroup(chat.jid)
  const chatName = getChatName()

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col h-full bg-gray-100 min-w-0 border-r relative z-0">
        {/* Header */}
        <div className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-3 shadow-md">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-white hover:bg-emerald-700 md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="relative">
            <Avatar name={chatName} size="md" className="border-2 border-emerald-400" />
            {isGroupChat && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                <Users className="w-3 h-3 text-emerald-600" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{chatName}</h2>
            <p className="text-xs text-emerald-100 truncate">
              {isGroupChat ? "Grupo" : formatPhone(chat.jid)}
            </p>

          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLeadPanel(!showLeadPanel)}
            className={`text-white hover:bg-emerald-700 ${showLeadPanel ? 'bg-emerald-700' : ''}`}
            title="Info del contacto"
          >
            <Info className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden p-4"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1d5db' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p>No hay mensajes</p>
              <p className="text-sm">¡Envía el primero!</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onSendImage={handleSendImage}
          onSendFile={handleSendFile}
          onSendAudio={handleSendAudio}
          onSendVideo={handleSendVideo}
          disabled={sending || !isConnected}
          disabledReason={!isConnected ? 'Conecta tu WhatsApp para enviar mensajes' : undefined}
        />
      </div>

      {showLeadPanel && (
        <LeadDetailsPanel
          jid={chat.jid}
          onClose={() => setShowLeadPanel(false)}
        />
      )}
    </div>
  )
}
