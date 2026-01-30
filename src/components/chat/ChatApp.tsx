"use client"

import { useState, useEffect, useCallback } from "react"
import { Chat, Contact } from "@/lib/difusion"
import { ChatList } from "./ChatList"
import { ChatWindow } from "./ChatWindow"
import { MediaManager } from "./MediaManager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  LogOut,
  MessageSquare,
  Search,
  RefreshCw,
  HardDrive
} from "lucide-react"

interface ChatAppProps {
  onLogout: () => void
}

export function ChatApp({ onLogout }: ChatAppProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedChatJid, setSelectedChatJid] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [loggingOut, setLoggingOut] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mediaManagerOpen, setMediaManagerOpen] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      // Fetch sequentially to avoid backend race conditions
      const chatsRes = await fetch("/api/chats")
      if (chatsRes.status === 401) {
        handleLogout() // Auto logout on 401
        return
      }
      const chatsData = await chatsRes.json()

      const contactsRes = await fetch("/api/contacts")
      if (contactsRes.status === 401) {
        // If contacts fail but chats worked, maybe just warn? 
        // But usually 401 means global session loss.
        handleLogout()
        return
      }
      const contactsData = await contactsRes.json()

      if (chatsData.results?.data) {
        setChats(chatsData.results.data)
      }
      if (contactsData.results?.data) {
        setContacts(contactsData.results.data)
      }
    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Periodically check connection status and auto-logout if disconnected
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch("/api/status")
        const data = await response.json()
        if (!data.results?.is_logged_in) {
          console.log("Session lost, logging out")
          onLogout()
        }
      } catch (err) {
        console.error("Error checking connection status:", err)
      }
    }

    // Check connection every 15 seconds
    const interval = setInterval(checkConnection, 15000)
    return () => clearInterval(interval)
  }, [onLogout])

  const handleLogout = async () => {
    if (loggingOut) return

    if (!confirm("¿Estás seguro de que quieres cerrar sesión?")) return

    setLoggingOut(true)
    try {
      await fetch("/api/logout")
      onLogout()
    } catch (err) {
      console.error("Error logging out:", err)
      setLoggingOut(false)
    }
  }

  const selectedChat = chats.find(c => c.jid === selectedChatJid)

  // Filter chats based on search
  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true
    const name = chat.name?.toLowerCase() || ""
    const jid = chat.jid.toLowerCase()
    const search = searchTerm.toLowerCase()
    return name.includes(search) || jid.includes(search)
  })

  // Handle mobile view
  const handleSelectChat = (jid: string) => {
    setSelectedChatJid(jid)
    setSidebarOpen(false)
  }

  const handleBack = () => {
    setSidebarOpen(true)
    setSelectedChatJid(null)
  }

  return (
    <div className="h-screen flex bg-white">
      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'flex' : 'hidden'} 
        md:flex flex-col w-full md:w-80 lg:w-96 border-r bg-white
        absolute md:relative z-10 h-full
      `}>
        {/* Sidebar Header */}
        <div className="bg-emerald-600 text-white px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              <h1 className="text-lg font-bold">Propaganda</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMediaManagerOpen(true)}
                className="text-white hover:bg-emerald-700"
                title="Almacenamiento multimedia"
              >
                <HardDrive className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchData}
                className="text-white hover:bg-emerald-700"
                title="Actualizar"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-white hover:bg-emerald-700"
                title="Cerrar sesión"
              >
                <LogOut className={`w-5 h-5 ${loggingOut ? 'animate-pulse' : ''}`} />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-200" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar chat..."
              className="pl-9 bg-emerald-700 border-emerald-500 text-white placeholder:text-emerald-200"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          ) : (
            <ChatList
              chats={filteredChats}
              contacts={contacts}
              selectedChat={selectedChatJid}
              onSelectChat={handleSelectChat}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50 text-center text-xs text-gray-400">
          {chats.length} conversaciones • {contacts.length} contactos
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`
        ${!sidebarOpen || selectedChat ? 'flex' : 'hidden'} 
        md:flex flex-1 flex-col
      `}>
        {selectedChat ? (
          <ChatWindow
            chat={selectedChat}
            contacts={contacts}
            onBack={handleBack}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
            <div className="w-64 h-64 mb-6">
              <svg viewBox="0 0 303 172" className="w-full h-full opacity-20">
                <path fill="currentColor" d="M229.565 160.229c-5.982 7.608-19.861 8.103-19.861 8.103s-2.166-14.088 3.815-21.696c5.982-7.608 19.861-8.103 19.861-8.103s2.166 14.089-3.815 21.696zm-160.067-.051c5.982 7.608 19.861 8.103 19.861 8.103s2.166-14.088-3.815-21.696c-5.982-7.608-19.861-8.103-19.861-8.103s-2.167 14.089 3.815 21.696z"></path>
                <path fill="currentColor" d="M152.711 0c-45.611 0-82.571 36.96-82.571 82.571 0 17.659 5.554 34.023 15.001 47.441l-9.82 36.559 37.441-9.819c13.418 9.447 29.782 15.001 47.441 15.001 45.611 0 82.571-36.96 82.571-82.571S198.322 0 152.711 0z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-medium text-gray-600 mb-2">Propaganda Chat</h2>
            <p className="text-sm">Selecciona una conversación para comenzar</p>
          </div>
        )}
      </div>

      {/* Media Manager Modal */}
      <MediaManager
        isOpen={mediaManagerOpen}
        onClose={() => setMediaManagerOpen(false)}
      />
    </div>
  )
}
