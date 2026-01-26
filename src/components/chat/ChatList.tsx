"use client"

import { Chat, Contact } from "@/lib/difusion"
import { Avatar } from "@/components/ui/avatar"
import { cn, formatPhone, isGroup } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { MessageSquare, Users } from "lucide-react"

interface ChatListProps {
  chats: Chat[]
  contacts: Contact[]
  selectedChat: string | null
  onSelectChat: (jid: string) => void
}

export function ChatList({ chats, contacts, selectedChat, onSelectChat }: ChatListProps) {
  // Create a map of contacts for quick lookup
  const contactMap = new Map(contacts.map(c => [c.jid, c.name]))

  const getChatName = (chat: Chat) => {
    if (chat.name && chat.name !== chat.jid.split('@')[0]) {
      return chat.name
    }
    const contactName = contactMap.get(chat.jid)
    if (contactName) return contactName
    return formatPhone(chat.jid)
  }

  const sortedChats = [...chats].sort((a, b) => 
    new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
  )

  if (sortedChats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
        <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-center">No hay conversaciones</p>
        <p className="text-sm text-center mt-1">Los chats aparecerán aquí cuando recibas mensajes</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {sortedChats.map((chat) => {
        const name = getChatName(chat)
        const isSelected = selectedChat === chat.jid
        const isGroupChat = isGroup(chat.jid)

        return (
          <button
            key={chat.jid}
            onClick={() => onSelectChat(chat.jid)}
            className={cn(
              "flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100",
              isSelected && "bg-emerald-50 hover:bg-emerald-50"
            )}
          >
            <div className="relative">
              <Avatar name={name} size="md" />
              {isGroupChat && (
                <div className="absolute -bottom-1 -right-1 bg-gray-600 rounded-full p-0.5">
                  <Users className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  "font-medium truncate",
                  isSelected ? "text-emerald-700" : "text-gray-900"
                )}>
                  {name}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {formatDistanceToNow(new Date(chat.last_message_time), { 
                    addSuffix: false, 
                    locale: es 
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">
                {isGroupChat ? "Grupo" : formatPhone(chat.jid)}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
