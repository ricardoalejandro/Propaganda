'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Header } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Search,
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
  MoreVertical,
  Phone,
  Video,
  User,
  MessageSquare,
  Loader2,
  CheckCheck,
  Check,
  Clock,
  Filter,
  Star,
  Archive,
  ChevronRight,
  X,
  DollarSign,
  Tag,
  Calendar,
  Building,
} from 'lucide-react'
import { cn, formatRelativeTime, formatTime, getInitials } from '@/lib/utils'
import { toast } from 'sonner'

interface Conversation {
  id: string
  jid: string
  contactPhone: string
  contactName: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  account: {
    id: string
    deviceId: string
    phoneNumber: string | null
    filial: string | null
  } | null
  lead: {
    id: string
    name: string
    value: number | null
    stage: { name: string; color: string } | null
    funnel: { name: string } | null
  } | null
}

interface Message {
  id: string
  fromMe: boolean
  body: string
  content: string | null
  type: string
  mediaUrl: string | null
  timestamp: string
  status: string | null
}

// Chat List Item
function ChatListItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation
  isSelected: boolean
  onClick: () => void
}) {
  const displayName =
    conversation.contactName ||
    conversation.lead?.name ||
    conversation.contactPhone

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-3 cursor-pointer transition-colors border-b',
        isSelected
          ? 'bg-green-50 border-l-2 border-l-green-500'
          : 'hover:bg-slate-50'
      )}
    >
      <div className="relative">
        <Avatar className="w-12 h-12">
          <AvatarFallback className="bg-slate-100 text-slate-600">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        {conversation.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
            {conversation.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-sm truncate">{displayName}</span>
          {conversation.lastMessageAt && (
            <span className="text-xs text-slate-400 flex-shrink-0">
              {formatRelativeTime(conversation.lastMessageAt)}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 truncate">
          {conversation.lastMessage || 'Sin mensajes'}
        </p>
        {conversation.account?.filial && (
          <Badge variant="outline" className="text-xs mt-1 px-1.5 py-0">
            {conversation.account.filial}
          </Badge>
        )}
      </div>
    </div>
  )
}

// Message Bubble
function MessageBubble({ message }: { message: Message }) {
  const isFromMe = message.fromMe

  const statusIcons: Record<string, typeof Check> = {
    sent: Check,
    delivered: CheckCheck,
    read: CheckCheck,
    pending: Clock,
    failed: X,
  }
  const StatusIcon = message.status ? (statusIcons[message.status] || Check) : Check

  return (
    <div
      className={cn(
        'flex mb-2',
        isFromMe ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-3 py-2 shadow-sm',
          isFromMe
            ? 'bg-green-500 text-white rounded-br-none'
            : 'bg-white text-slate-900 rounded-bl-none border'
        )}
      >
        {/* Media */}
        {message.mediaUrl && message.type === 'image' && (
          <img
            src={message.mediaUrl}
            alt="Imagen"
            className="max-w-full rounded mb-2"
          />
        )}

        {/* Content */}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.body || message.content}
        </p>

        {/* Time and Status */}
        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isFromMe ? 'justify-end' : 'justify-start'
          )}
        >
          <span
            className={cn(
              'text-xs',
              isFromMe ? 'text-green-100' : 'text-slate-400'
            )}
          >
            {formatTime(message.timestamp)}
          </span>
          {isFromMe && (
            <StatusIcon
              className={cn(
                'w-3 h-3',
                message.status === 'read'
                  ? 'text-blue-300'
                  : 'text-green-200'
              )}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Lead Sidebar Panel
function LeadPanel({
  lead,
  onClose,
}: {
  lead: Conversation['lead']
  onClose: () => void
}) {
  if (!lead) return null

  return (
    <div className="w-80 bg-white border-l flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Información del Lead</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Name & Stage */}
          <div className="text-center">
            <Avatar className="w-16 h-16 mx-auto mb-2">
              <AvatarFallback className="bg-green-100 text-green-700 text-xl">
                {getInitials(lead.name)}
              </AvatarFallback>
            </Avatar>
            <h4 className="font-semibold">{lead.name}</h4>
            {lead.stage && (
              <Badge
                className="mt-1"
                style={{
                  backgroundColor: lead.stage.color + '20',
                  color: lead.stage.color,
                  borderColor: lead.stage.color,
                }}
              >
                {lead.stage.name}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-3">
            {lead.value && (
              <div className="flex items-center gap-3 text-sm">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <span>S/ {lead.value.toLocaleString()}</span>
              </div>
            )}
            {lead.funnel && (
              <div className="flex items-center gap-3 text-sm">
                <Tag className="w-4 h-4 text-slate-400" />
                <span>{lead.funnel.name}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" size="sm">
              <ChevronRight className="w-4 h-4 mr-2" />
              Ver en embudo
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Programar seguimiento
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

export default function InboxPage() {
  const queryClient = useQueryClient()
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null)
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [showLeadPanel, setShowLeadPanel] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch conversations
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', accountFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (accountFilter !== 'all') params.set('accountId', accountFilter)
      if (searchQuery) params.set('search', searchQuery)
      const res = await axios.get(`/api/conversations?${params}`)
      return res.data
    },
    refetchInterval: 5000,
  })

  const conversations: Conversation[] = conversationsData?.conversations || []

  // Fetch selected conversation with messages
  const { data: conversationData, isLoading: messagesLoading } = useQuery({
    queryKey: ['conversation', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null
      const res = await axios.get(`/api/conversations/${selectedConversationId}`)
      return res.data
    },
    enabled: !!selectedConversationId,
    refetchInterval: 3000,
  })

  const selectedConversation = conversationData?.conversation
  const messages: Message[] = selectedConversation?.messages || []

  // Fetch accounts for filter
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await axios.get('/api/accounts')
      return res.data
    },
  })

  const accounts = accountsData?.accounts || []

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string
      content: string
    }) => {
      const res = await axios.post(
        `/api/conversations/${conversationId}/messages`,
        { content }
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation'] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setMessageInput('')
    },
    onError: (err: any) => {
      toast.error('Error al enviar mensaje', {
        description: err.response?.data?.error,
      })
    },
  })

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Select first conversation on load
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id)
    }
  }, [conversations, selectedConversationId])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() || !selectedConversationId) return
    sendMutation.mutate({
      conversationId: selectedConversationId,
      content: messageInput.trim(),
    })
  }

  const currentConversation = conversations.find(
    (c) => c.id === selectedConversationId
  )

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 bg-white border-b">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-slate-900">Inbox</h1>
            <Badge variant="secondary">
              {conversations.filter((c) => c.unreadCount > 0).length} sin leer
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todas las cuentas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las cuentas</SelectItem>
                {accounts.map((acc: any) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.filial || acc.phoneNumber || acc.deviceId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Conversation List */}
          <div className="w-80 bg-white border-r flex flex-col">
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar conversaciones..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <MessageSquare className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-slate-500 text-sm">
                    No hay conversaciones aún
                  </p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <ChatListItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={conversation.id === selectedConversationId}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  />
                ))
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          {selectedConversationId ? (
            <div className="flex-1 flex flex-col bg-slate-100">
              {/* Chat Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {getInitials(
                        currentConversation?.contactName ||
                          currentConversation?.lead?.name ||
                          currentConversation?.contactPhone ||
                          ''
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm">
                      {currentConversation?.contactName ||
                        currentConversation?.lead?.name ||
                        currentConversation?.contactPhone}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {currentConversation?.contactPhone}
                      {currentConversation?.account?.filial &&
                        ` · ${currentConversation.account.filial}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Phone className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Llamar</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowLeadPanel(!showLeadPanel)}
                        className={showLeadPanel ? 'bg-slate-100' : ''}
                      >
                        <User className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ver lead</TooltipContent>
                  </Tooltip>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-slate-500">
                      No hay mensajes en esta conversación
                    </p>
                    <p className="text-sm text-slate-400">
                      Envía un mensaje para empezar
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </ScrollArea>

              {/* Message Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t"
              >
                <div className="flex items-end gap-2">
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon">
                          <Paperclip className="w-5 h-5 text-slate-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Adjuntar archivo</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon">
                          <ImageIcon className="w-5 h-5 text-slate-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Enviar imagen</TooltipContent>
                    </Tooltip>
                  </div>
                  <Textarea
                    placeholder="Escribe un mensaje..."
                    className="flex-1 min-h-[44px] max-h-32 resize-none"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage(e)
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!messageInput.trim() || sendMutation.isPending}
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">
                  Selecciona una conversación
                </h3>
                <p className="text-slate-500">
                  Elige una conversación de la lista para ver los mensajes
                </p>
              </div>
            </div>
          )}

          {/* Lead Panel */}
          {showLeadPanel && currentConversation?.lead && (
            <LeadPanel
              lead={currentConversation.lead}
              onClose={() => setShowLeadPanel(false)}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
