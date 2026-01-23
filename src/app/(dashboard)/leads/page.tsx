'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Header } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Plus,
  MoreHorizontal,
  MessageSquare,
  Phone,
  Calendar,
  DollarSign,
  GripVertical,
  Loader2,
  Settings2,
  Search,
  Filter,
  ChevronDown,
  Users,
  Trophy,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatRelativeTime, getInitials } from '@/lib/utils'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Lead {
  id: string
  name: string
  phone: string
  email: string | null
  value: number | null
  source: string | null
  stageId: string
  funnelId: string
  position: number
  createdAt: string
  updatedAt: string
  stage?: Stage
  _count?: {
    notes: number
    conversations: number
  }
}

interface Stage {
  id: string
  name: string
  color: string
  position: number
  isWon: boolean
  isLost: boolean
  leads?: Lead[]
}

interface Funnel {
  id: string
  name: string
  isDefault: boolean
  stages: Stage[]
}

// Lead Card Component
function LeadCard({ 
  lead, 
  isDragging,
  onStartConversation,
  isStartingConversation,
}: { 
  lead: Lead
  isDragging?: boolean
  onStartConversation?: (leadId: string) => void
  isStartingConversation?: boolean
}) {
  return (
    <Card
      className={cn(
        'cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md',
        isDragging && 'opacity-50 shadow-lg rotate-2'
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                {getInitials(lead.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{lead.name}</p>
              <p className="text-xs text-slate-500 truncate">{lead.phone}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  onStartConversation?.(lead.id)
                }}
                disabled={isStartingConversation}
              >
                {isStartingConversation ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4 mr-2" />
                )}
                Iniciar conversación
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Phone className="w-4 h-4 mr-2" />
                Llamar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {lead.value && (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <DollarSign className="w-3 h-3" />
              {lead.value.toLocaleString()}
            </span>
          )}
          {lead.source && <Badge variant="secondary" className="text-xs px-1.5 py-0">{lead.source}</Badge>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatRelativeTime(lead.createdAt)}
          </span>
          {lead._count && lead._count.conversations > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {lead._count.conversations}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Sortable Lead Item
function SortableLeadItem({ 
  lead,
  onStartConversation,
  isStartingConversation,
}: { 
  lead: Lead
  onStartConversation?: (leadId: string) => void
  isStartingConversation?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCard 
        lead={lead} 
        isDragging={isDragging} 
        onStartConversation={onStartConversation}
        isStartingConversation={isStartingConversation}
      />
    </div>
  )
}

// Stage Column Component
function StageColumn({
  stage,
  leads,
  funnelId,
  onStartConversation,
  startingConversationId,
}: {
  stage: Stage
  leads: Lead[]
  funnelId: string
  onStartConversation?: (leadId: string) => void
  startingConversationId?: string | null
}) {
  const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0)

  return (
    <div className="flex flex-col w-72 flex-shrink-0 bg-slate-50 rounded-lg">
      {/* Column Header */}
      <div
        className="p-3 rounded-t-lg border-b-2"
        style={{ borderColor: stage.color }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {stage.isWon && <Trophy className="w-4 h-4 text-green-500" />}
            {stage.isLost && <XCircle className="w-4 h-4 text-red-500" />}
            <h3 className="font-semibold text-sm">{stage.name}</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {leads.length}
          </Badge>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-slate-500">
            S/ {totalValue.toLocaleString()}
          </p>
        )}
      </div>

      {/* Leads List */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[100px]">
            {leads.map((lead) => (
              <SortableLeadItem 
                key={lead.id} 
                lead={lead}
                onStartConversation={onStartConversation}
                isStartingConversation={startingConversationId === lead.id}
              />
            ))}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  )
}

export default function LeadsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null)
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [startingConversationId, setStartingConversationId] = useState<string | null>(null)
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    value: '',
    source: '',
    stageId: '',
  })

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch funnels
  const { data: funnelsData, isLoading: funnelsLoading } = useQuery({
    queryKey: ['funnels'],
    queryFn: async () => {
      const res = await axios.get('/api/funnels')
      return res.data
    },
  })

  const funnels: Funnel[] = funnelsData?.funnels || []

  // Set default funnel
  useEffect(() => {
    if (funnels.length > 0 && !selectedFunnelId) {
      const defaultFunnel = funnels.find((f) => f.isDefault) || funnels[0]
      setSelectedFunnelId(defaultFunnel.id)
    }
  }, [funnels, selectedFunnelId])

  // Fetch leads for selected funnel
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', selectedFunnelId, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedFunnelId) params.set('funnelId', selectedFunnelId)
      if (searchQuery) params.set('search', searchQuery)
      const res = await axios.get(`/api/leads?${params}`)
      return res.data
    },
    enabled: !!selectedFunnelId,
  })

  const leads: Lead[] = leadsData?.leads || []
  const selectedFunnel = funnels.find((f) => f.id === selectedFunnelId)

  // Move lead mutation
  const moveMutation = useMutation({
    mutationFn: async ({
      leadId,
      stageId,
      position,
    }: {
      leadId: string
      stageId: string
      position: number
    }) => {
      const res = await axios.put(`/api/leads/${leadId}`, { stageId, position })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: (err: any) => {
      toast.error('Error al mover lead')
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  // Add lead mutation
  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axios.post('/api/leads', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setIsAddLeadOpen(false)
      setNewLead({
        name: '',
        phone: '',
        email: '',
        value: '',
        source: '',
        stageId: '',
      })
      toast.success('Lead creado')
    },
    onError: (err: any) => {
      toast.error('Error al crear lead', {
        description: err.response?.data?.error,
      })
    },
  })

  // Start conversation mutation
  const startConversationMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const res = await axios.post('/api/conversations', { leadId })
      return res.data
    },
    onSuccess: (data) => {
      const conversationId = data.conversation?.id
      toast.success('Conversación iniciada')
      // Navegar al inbox con la conversación seleccionada
      if (conversationId) {
        router.push(`/inbox?conversationId=${conversationId}`)
      } else {
        router.push('/inbox')
      }
    },
    onError: (err: any) => {
      toast.error('Error al iniciar conversación', {
        description: err.response?.data?.error,
      })
      setStartingConversationId(null)
    },
  })

  // Handle start conversation
  const handleStartConversation = (leadId: string) => {
    setStartingConversationId(leadId)
    startConversationMutation.mutate(leadId)
  }

  // Get leads by stage
  const getLeadsByStage = (stageId: string) => {
    return leads
      .filter((l) => l.stageId === stageId)
      .sort((a, b) => a.position - b.position)
  }

  // Find active lead
  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeLeadId = active.id as string
    const overId = over.id as string

    // Find the lead being dragged
    const draggedLead = leads.find((l) => l.id === activeLeadId)
    if (!draggedLead) return

    // Determine target stage
    let targetStageId: string
    let targetPosition: number

    // Check if dropping over another lead
    const overLead = leads.find((l) => l.id === overId)
    if (overLead) {
      targetStageId = overLead.stageId
      targetPosition = overLead.position
    } else {
      // Dropping over a stage column
      const stage = selectedFunnel?.stages.find((s) => s.id === overId)
      if (stage) {
        targetStageId = stage.id
        targetPosition = getLeadsByStage(stage.id).length
      } else {
        return
      }
    }

    // Only update if something changed
    if (
      draggedLead.stageId !== targetStageId ||
      draggedLead.position !== targetPosition
    ) {
      moveMutation.mutate({
        leadId: activeLeadId,
        stageId: targetStageId,
        position: targetPosition,
      })
    }
  }

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLead.name || !newLead.phone) {
      toast.error('Nombre y teléfono son requeridos')
      return
    }
    if (!newLead.stageId && selectedFunnel?.stages[0]) {
      newLead.stageId = selectedFunnel.stages[0].id
    }
    addMutation.mutate({
      name: newLead.name,
      phoneNumber: newLead.phone, // El backend espera 'phoneNumber'
      email: newLead.email || undefined,
      source: newLead.source || undefined,
      funnelId: selectedFunnelId,
      stageId: newLead.stageId,
      value: newLead.value ? parseFloat(newLead.value) : null,
    })
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Leads"
        subtitle={selectedFunnel?.name || 'Embudo de ventas'}
        actions={
          <div className="flex items-center gap-2">
            {/* Funnel Selector */}
            <Select
              value={selectedFunnelId || ''}
              onValueChange={setSelectedFunnelId}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar embudo" />
              </SelectTrigger>
              <SelectContent>
                {funnels.map((funnel) => (
                  <SelectItem key={funnel.id} value={funnel.id}>
                    {funnel.name}
                    {funnel.isDefault && ' (Principal)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar leads..."
                className="pl-9 w-48"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Add Lead */}
            <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Lead
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar nuevo lead</DialogTitle>
                  <DialogDescription>
                    Ingresa los datos del prospecto para agregarlo al embudo.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddLead}>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nombre *</Label>
                        <Input
                          id="name"
                          placeholder="Juan Pérez"
                          value={newLead.name}
                          onChange={(e) =>
                            setNewLead({ ...newLead, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono *</Label>
                        <Input
                          id="phone"
                          placeholder="+51 999 888 777"
                          value={newLead.phone}
                          onChange={(e) =>
                            setNewLead({ ...newLead, phone: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="juan@empresa.com"
                        value={newLead.email}
                        onChange={(e) =>
                          setNewLead({ ...newLead, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="value">Valor (S/)</Label>
                        <Input
                          id="value"
                          type="number"
                          placeholder="1000"
                          value={newLead.value}
                          onChange={(e) =>
                            setNewLead({ ...newLead, value: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="source">Fuente</Label>
                        <Input
                          id="source"
                          placeholder="Facebook, Google..."
                          value={newLead.source}
                          onChange={(e) =>
                            setNewLead({ ...newLead, source: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Etapa inicial</Label>
                      <Select
                        value={newLead.stageId}
                        onValueChange={(v) =>
                          setNewLead({ ...newLead, stageId: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Primera etapa" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedFunnel?.stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: stage.color }}
                                />
                                {stage.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddLeadOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={addMutation.isPending}
                    >
                      {addMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Crear Lead
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Kanban Board */}
      <div className="flex-1 p-6 overflow-hidden">
        {funnelsLoading || leadsLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : !selectedFunnel ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Users className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              No hay embudos configurados
            </h3>
            <p className="text-slate-500 mb-4">
              Crea un embudo de ventas para empezar
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Crear Embudo
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <ScrollArea className="h-full">
              <div className="flex gap-4 pb-4 min-w-max">
                {selectedFunnel.stages
                  .sort((a, b) => a.position - b.position)
                  .map((stage) => (
                    <StageColumn
                      key={stage.id}
                      stage={stage}
                      leads={getLeadsByStage(stage.id)}
                      funnelId={selectedFunnelId!}
                      onStartConversation={handleStartConversation}
                      startingConversationId={startingConversationId}
                    />
                  ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  )
}
