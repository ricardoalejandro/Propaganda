'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Header } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  Info,
  RefreshCw,
  Search,
  Trash2,
  Loader2,
  FileText,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface SystemLog {
  id: string
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  category: string
  action: string
  message: string
  details: Record<string, unknown> | null
  accountId: string | null
  leadId: string | null
  requestId: string | null
  ip: string | null
  userAgent: string | null
  error: string | null
  stack: string | null
  createdAt: string
}

interface Settings {
  logsEnabled: boolean
}

const levelConfig = {
  DEBUG: {
    label: 'Debug',
    icon: Bug,
    color: 'bg-slate-100 text-slate-800 border-slate-200',
    bgColor: 'bg-slate-50',
  },
  INFO: {
    label: 'Info',
    icon: Info,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    bgColor: 'bg-blue-50',
  },
  WARN: {
    label: 'Warn',
    icon: AlertTriangle,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    bgColor: 'bg-yellow-50',
  },
  ERROR: {
    label: 'Error',
    icon: AlertCircle,
    color: 'bg-red-100 text-red-800 border-red-200',
    bgColor: 'bg-red-50',
  },
}

const categoryColors: Record<string, string> = {
  connection: 'bg-green-100 text-green-800',
  lead: 'bg-purple-100 text-purple-800',
  message: 'bg-blue-100 text-blue-800',
  api: 'bg-orange-100 text-orange-800',
  webhook: 'bg-pink-100 text-pink-800',
  system: 'bg-slate-100 text-slate-800',
}

export default function LogsPage() {
  const queryClient = useQueryClient()
  const [level, setLevel] = useState<string>('ALL')
  const [category, setCategory] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch settings
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axios.get('/api/settings')
      return res.data.settings as Settings
    },
  })

  // Fetch logs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['logs', level, category, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (level !== 'ALL') params.append('level', level)
      if (category !== 'ALL') params.append('category', category)
      if (search) params.append('search', search)
      params.append('limit', '200')
      
      const res = await axios.get(`/api/logs?${params.toString()}`)
      return res.data
    },
    refetchInterval: autoRefresh ? 5000 : false, // Refresh every 5 seconds if auto-refresh is on
  })

  // Update settings mutation
  const settingsMutation = useMutation({
    mutationFn: async (data: Partial<Settings>) => {
      const res = await axios.patch('/api/settings', data)
      return res.data.settings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Configuración actualizada')
    },
    onError: () => {
      toast.error('Error al actualizar configuración')
    },
  })

  // Delete logs mutation
  const deleteMutation = useMutation({
    mutationFn: async (deleteAll: boolean) => {
      const res = await axios.delete(`/api/logs?all=${deleteAll}`)
      return res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      toast.success(`${data.deletedCount} logs eliminados`)
      setDeleteDialogOpen(false)
    },
    onError: () => {
      toast.error('Error al eliminar logs')
    },
  })

  const logs: SystemLog[] = data?.logs || []
  const total = data?.total || 0

  // Stats
  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.level === 'ERROR').length,
    warnings: logs.filter(l => l.level === 'WARN').length,
    info: logs.filter(l => l.level === 'INFO').length,
  }

  const toggleExpand = (id: string) => {
    setExpandedLog(expandedLog === id ? null : id)
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Logs del Sistema"
        subtitle="Monitoreo y debugging de la aplicación"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar Logs
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        {/* Settings Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-500" />
                <CardTitle className="text-base">Configuración de Logs</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="logs-enabled">Generación de logs habilitada</Label>
                <Switch
                  id="logs-enabled"
                  checked={settingsData?.logsEnabled ?? true}
                  onCheckedChange={(checked) => settingsMutation.mutate({ logsEnabled: checked })}
                  disabled={settingsMutation.isPending}
                />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Logs</CardDescription>
              <CardTitle className="text-3xl">{total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Errores</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.errors}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Warnings</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">{stats.warnings}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Info</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{stats.info}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label className="mb-2 block">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar en logs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-[150px]">
                <Label className="mb-2 block">Nivel</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="DEBUG">Debug</SelectItem>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARN">Warning</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[150px]">
                <Label className="mb-2 block">Categoría</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas</SelectItem>
                    <SelectItem value="connection">Connection</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : logs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">
                No hay logs
              </h3>
              <p className="text-slate-500">
                Los logs aparecerán aquí cuando se generen
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const config = levelConfig[log.level]
              const LevelIcon = config.icon
              const isExpanded = expandedLog === log.id
              const hasDetails = log.details || log.error || log.stack

              return (
                <Card
                  key={log.id}
                  className={cn(
                    'transition-colors',
                    config.bgColor,
                    hasDetails && 'cursor-pointer hover:shadow-md'
                  )}
                  onClick={() => hasDetails && toggleExpand(log.id)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      <LevelIcon className={cn(
                        'w-5 h-5 mt-0.5 flex-shrink-0',
                        log.level === 'ERROR' && 'text-red-600',
                        log.level === 'WARN' && 'text-yellow-600',
                        log.level === 'INFO' && 'text-blue-600',
                        log.level === 'DEBUG' && 'text-slate-500',
                      )} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className={cn('text-xs', config.color)}>
                            {config.label}
                          </Badge>
                          <Badge variant="outline" className={cn('text-xs', categoryColors[log.category] || 'bg-slate-100')}>
                            {log.category}
                          </Badge>
                          <span className="text-xs text-slate-500 font-mono">
                            {log.action}
                          </span>
                          <span className="text-xs text-slate-400">
                            {format(new Date(log.createdAt), 'dd/MM HH:mm:ss', { locale: es })}
                          </span>
                        </div>
                        
                        <p className="text-sm text-slate-700">
                          {log.message}
                        </p>

                        {log.error && !isExpanded && (
                          <p className="text-xs text-red-600 mt-1 truncate">
                            Error: {log.error}
                          </p>
                        )}

                        {/* Expanded Details */}
                        {isExpanded && hasDetails && (
                          <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                            {log.error && (
                              <div>
                                <Label className="text-xs text-red-600 font-semibold">Error:</Label>
                                <pre className="text-xs bg-red-100 p-2 rounded mt-1 overflow-x-auto">
                                  {log.error}
                                </pre>
                              </div>
                            )}
                            
                            {log.stack && (
                              <div>
                                <Label className="text-xs text-red-600 font-semibold">Stack Trace:</Label>
                                <pre className="text-xs bg-red-100 p-2 rounded mt-1 overflow-x-auto whitespace-pre-wrap">
                                  {log.stack}
                                </pre>
                              </div>
                            )}
                            
                            {log.details && (
                              <div>
                                <Label className="text-xs text-slate-600 font-semibold">Detalles:</Label>
                                <pre className="text-xs bg-slate-100 p-2 rounded mt-1 overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}

                            {(log.accountId || log.leadId || log.requestId) && (
                              <div className="flex flex-wrap gap-2 text-xs">
                                {log.requestId && (
                                  <span className="font-mono text-slate-500">
                                    Request: {log.requestId.slice(0, 8)}...
                                  </span>
                                )}
                                {log.accountId && (
                                  <span className="font-mono text-green-600">
                                    Account: {log.accountId.slice(0, 8)}...
                                  </span>
                                )}
                                {log.leadId && (
                                  <span className="font-mono text-purple-600">
                                    Lead: {log.leadId.slice(0, 8)}...
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {hasDetails && (
                        <Button variant="ghost" size="sm" className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Logs</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar todos los logs?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(true)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar Todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
