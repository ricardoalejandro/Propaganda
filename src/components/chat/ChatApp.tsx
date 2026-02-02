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
  HardDrive,
  Wifi,
  WifiOff,
  ChevronDown
} from "lucide-react"

interface Connection {
  id: string
  name: string
  deviceId: string | null
  isConnected: boolean
  isLoggedIn: boolean
}

interface ChatAppProps {
  onLogout: () => void
  embedded?: boolean
  isConnected?: boolean
}

export function ChatApp({ onLogout, embedded = false, isConnected = true }: ChatAppProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedChatJid, setSelectedChatJid] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [loggingOut, setLoggingOut] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mediaManagerOpen, setMediaManagerOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)
  
  // Multi-device support
  const [connections, setConnections] = useState<Connection[]>([])
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>('all') // 'all' = show all chats
  const [showConnectionPicker, setShowConnectionPicker] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  // Track viewport size
  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 768)
    checkIsDesktop()
    window.addEventListener('resize', checkIsDesktop)
    return () => window.removeEventListener('resize', checkIsDesktop)
  }, [])

  // Fetch available connections
  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/devices')
      const data = await res.json()
      
      if (data.code === 'SUCCESS' && Array.isArray(data.results)) {
        setConnections(data.results)
        // Keep 'all' as default - don't auto-switch
      }
    } catch (err) {
      console.error('Error fetching connections:', err)
    }
  }, [])

  // Fetch chats for active connection
  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      // Only add connection_id if a specific connection is selected (not 'all')
      if (activeConnectionId && activeConnectionId !== 'all') {
        params.set('connection_id', activeConnectionId)
      }

      const chatsRes = await fetch(`/api/chats?${params.toString()}`)
      if (chatsRes.status === 401) {
        handleLogout()
        return
      }
      const chatsData = await chatsRes.json()

      // Check if response is from offline cache
      setIsOffline(!!chatsData._offline)

      const contactsRes = await fetch(`/api/contacts?${params.toString()}`)
      if (contactsRes.status === 401) {
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
      setIsOffline(true)
    } finally {
      setLoading(false)
    }
  }, [activeConnectionId])

  // Initial load and polling
  useEffect(() => {
    fetchConnections()
    const interval = setInterval(fetchConnections, 30000) // Less frequent for connections
    return () => clearInterval(interval)
  }, [fetchConnections])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData, activeConnectionId])

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
  const activeConnection = activeConnectionId === 'all' ? null : connections.find(c => c.id === activeConnectionId)
  const anyConnectionLoggedIn = connections.some(c => c.isLoggedIn)

  // Filter chats based on search
  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true
    const name = chat.name?.toLowerCase() || ""
    const jid = chat.jid.toLowerCase()
    const search = searchTerm.toLowerCase()
    return name.includes(search) || jid.includes(search)
  })

  const handleSelectChat = (jid: string) => {
    setSelectedChatJid(jid)
    setSidebarOpen(false)
  }

  const handleBack = () => {
    setSidebarOpen(true)
    setSelectedChatJid(null)
  }

  const handleSwitchConnection = (connectionId: string) => {
    setActiveConnectionId(connectionId)
    setShowConnectionPicker(false)
    setSelectedChatJid(null)
    setChats([])
    setLoading(true)
  }

  return (
    <div className={`${embedded ? 'h-full' : 'h-screen'} flex bg-white`}>
      {/* Sidebar */}
      <div
        className={`
          flex-col ${embedded ? 'w-80 lg:w-96' : 'w-full md:w-80 lg:w-96'} 
          border-r bg-white shrink-0 h-full
        `}
        style={{
          display: embedded || isDesktop || sidebarOpen || !selectedChat ? 'flex' : 'none',
        }}
      >
        {/* Sidebar Header */}
        <div className="bg-emerald-600 text-white px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            {!embedded && (
              <div className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                <h1 className="text-lg font-bold">Propaganda</h1>
              </div>
            )}
            {embedded && (
              <h2 className="text-lg font-semibold">Chats</h2>
            )}
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
              {!embedded && (
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
              )}
            </div>
          </div>

          {/* Connection Selector (if multiple) */}
          {connections.length > 0 && (
            <div className="mb-3 relative">
              <button
                onClick={() => setShowConnectionPicker(!showConnectionPicker)}
                className="w-full flex items-center justify-between px-3 py-2 bg-emerald-700 rounded-lg text-sm hover:bg-emerald-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {activeConnectionId === 'all' ? (
                    <Wifi className="w-4 h-4 text-blue-300" />
                  ) : activeConnection?.isLoggedIn ? (
                    <Wifi className="w-4 h-4 text-green-300" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-300" />
                  )}
                  <span className="truncate">
                    {activeConnectionId === 'all' ? 'Todos los chats' : activeConnection?.name || 'Seleccionar conexión'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showConnectionPicker ? 'rotate-180' : ''}`} />
              </button>

              {showConnectionPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-48 overflow-y-auto">
                  {/* Option to show all chats */}
                  <button
                    onClick={() => handleSwitchConnection('all')}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 border-b ${
                      activeConnectionId === 'all' ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <Wifi className="w-4 h-4 text-blue-500" />
                    <span className="truncate text-sm font-medium">Todos los chats</span>
                  </button>
                  {connections.map(conn => (
                    <button
                      key={conn.id}
                      onClick={() => handleSwitchConnection(conn.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 ${
                        conn.id === activeConnectionId ? 'bg-emerald-50' : ''
                      }`}
                    >
                      {conn.isLoggedIn ? (
                        <Wifi className="w-4 h-4 text-green-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="truncate text-sm">{conn.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Connection Warning Banner - only show when no connections are logged in */}
          {!anyConnectionLoggedIn && connections.length > 0 && (
            <div className="mb-3 px-3 py-2 bg-orange-500 text-white rounded-lg text-xs flex items-center gap-2">
              <WifiOff className="w-4 h-4" />
              <span>Conecta tu WhatsApp para enviar mensajes</span>
            </div>
          )}

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
          {connections.length > 1 && ` • ${connections.length} conexiones`}
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
            isConnected={isConnected && anyConnectionLoggedIn && !isOffline}
            connectionId={activeConnectionId === 'all' ? null : activeConnectionId}
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
            {connections.length === 0 && (
              <p className="text-xs mt-4 text-orange-500">
                No hay conexiones WhatsApp. Ve a Conexiones para agregar una.
              </p>
            )}
          </div>
        )}
      </div>

      <MediaManager
        isOpen={mediaManagerOpen}
        onClose={() => setMediaManagerOpen(false)}
      />
    </div>
  )
}
