"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Message, Chat, Contact } from "@/lib/difusion"
import { MessageBubble } from "./MessageBubble"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatPhone, isGroup } from "@/lib/utils"
import { Loader2, Send, ArrowLeft, Users } from "lucide-react"

interface ChatWindowProps {
  chat: Chat
  contacts: Contact[]
  onBack?: () => void
}

export function ChatWindow({ chat, contacts, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(chat.jid)}/messages`)
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [chat.jid])

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    const messageText = newMessage.trim()
    setNewMessage("")

    try {
      // Get phone number from JID
      const phone = chat.jid.split('@')[0]
      
      const response = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message: messageText }),
      })
      
      const data = await response.json()
      
      if (data.code === "SUCCESS") {
        // Refresh messages
        await fetchMessages()
      } else {
        console.error("Error sending:", data.message)
        setNewMessage(messageText) // Restore message on error
      }
    } catch (err) {
      console.error("Error sending message:", err)
      setNewMessage(messageText)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isGroupChat = isGroup(chat.jid)
  const chatName = getChatName()

  return (
    <div className="flex flex-col h-full bg-gray-100">
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
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4"
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
      <div className="bg-white border-t p-3 flex items-center gap-2">
        <Input
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          className="flex-1"
          disabled={sending}
        />
        <Button 
          onClick={handleSend} 
          disabled={!newMessage.trim() || sending}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  )
}
