'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Header } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus,
  MoreVertical,
  Smartphone,
  RefreshCw,
  LogOut,
  Trash2,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Wifi,
  WifiOff,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { cn } from '@/lib/utils'

// Componente para mostrar el QR con manejo de errores y countdown
function QRImageDisplay({ 
  qrLink, 
  duration = 30, 
  onRefresh 
}: { 
  qrLink: string
  duration?: number
  onRefresh: () => void 
}) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [countdown, setCountdown] = useState(duration)

  // Reset state cuando cambia el qrLink
  useEffect(() => {
    setImageError(false)
    setImageLoading(true)
    setCountdown(duration)
  }, [qrLink, duration])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setImageError(true)
      return
    }
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  if (imageError || countdown <= 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-64 h-64 bg-slate-100 rounded-lg flex flex-col items-center justify-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mb-2" />
          <p className="text-sm text-slate-500 text-center px-4">
            El QR ha expirado
          </p>
        </div>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Generar nuevo QR
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-4 bg-white rounded-lg border relative">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrLink}
          alt="QR Code"
          className={cn(
            "w-64 h-64 object-contain transition-opacity",
            imageLoading && "opacity-0"
          )}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageLoading(false)
            setImageError(true)
          }}
        />
      </div>
      <p className={cn(
        "text-sm font-medium",
        countdown <= 10 ? "text-red-500" : "text-slate-500"
      )}>
        El QR expira en {countdown} segundos
      </p>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRefresh}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Actualizar QR
      </Button>
    </div>
  )
}

interface WhatsAppAccount {
  id: string
  deviceId: string
  phoneNumber: string | null
  displayName: string | null
  filial: string | null
  encargado: string | null
  status: 'CONNECTED' | 'DISCONNECTED' | 'SCANNING' | 'ERROR'
  connectedAt: string | null
  createdAt: string
  updatedAt: string
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string; dot: string }> = {
  CONNECTED: {
    label: 'Conectado',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500',
  },
  SCANNING: {
    label: 'Escanear QR',
    icon: QrCode,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
  },
  DISCONNECTED: {
    label: 'Desconectado',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
  ERROR: {
    label: 'Error',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
}

export default function ConnectionsPage() {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<WhatsAppAccount | null>(null)
  const [newAccount, setNewAccount] = useState({
    deviceId: '',
    filial: '',
    encargado: '',
  })

  // Fetch accounts
  const { data, isLoading, error } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await axios.get('/api/accounts')
      return res.data
    },
    refetchInterval: 10000, // Refresh every 10s
  })

  // Fetch QR Code con polling para detectar conexión
  const [qrTimestamp, setQrTimestamp] = useState(0)
  
  const { data: qrData, isLoading: qrLoading } = useQuery({
    queryKey: ['account-qr', selectedAccount?.id, qrTimestamp],
    queryFn: async () => {
      if (!selectedAccount) return null
      const res = await axios.get(`/api/accounts/${selectedAccount.id}/qr`)
      return res.data
    },
    enabled: !!selectedAccount && isQrOpen,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: isQrOpen ? 2000 : false,
  })

  // Cerrar diálogo cuando se detecta conexión
  useEffect(() => {
    if (isQrOpen && qrData && qrData.status === 'CONNECTED') {
      // Pequeño delay para que el usuario vea el mensaje de éxito
      const timer = setTimeout(() => {
        toast.success('¡Conectado!', {
          description: 'WhatsApp vinculado exitosamente',
        })
        setIsQrOpen(false)
        setSelectedAccount(null)
        queryClient.invalidateQueries({ queryKey: ['accounts'] })
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isQrOpen, qrData, queryClient])

  // Add account mutation
  const addMutation = useMutation({
    mutationFn: async (data: typeof newAccount) => {
      const res = await axios.post('/api/accounts', data)
      return res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setIsAddOpen(false)
      setNewAccount({ deviceId: '', filial: '', encargado: '' })
      toast.success('Cuenta creada', {
        description: 'Ahora escanea el código QR para conectar',
      })
      // Open QR dialog for new account
      setSelectedAccount(data.account)
      setIsQrOpen(true)
    },
    onError: (err: any) => {
      toast.error('Error al crear cuenta', {
        description: err.response?.data?.error || 'Intenta de nuevo',
      })
    },
  })

  // Reconnect mutation
  const reconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`/api/accounts/${id}/reconnect`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Reconectando cuenta...')
    },
    onError: (err: any) => {
      toast.error('Error al reconectar', {
        description: err.response?.data?.error || 'Intenta de nuevo',
      })
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`/api/accounts/${id}/logout`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Sesión cerrada')
    },
    onError: (err: any) => {
      toast.error('Error al cerrar sesión', {
        description: err.response?.data?.error || 'Intenta de nuevo',
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, force = false }: { id: string; force?: boolean }) => {
      const url = force ? `/api/accounts/${id}?force=true` : `/api/accounts/${id}`
      const res = await axios.delete(url)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Cuenta eliminada')
    },
    onError: (err: any) => {
      const errorData = err.response?.data
      // Si hay leads asociados, preguntar si quiere forzar
      if (errorData?.leadsCount > 0) {
        const shouldForce = confirm(
          `${errorData.error}\n\n¿Deseas eliminar también los ${errorData.leadsCount} lead(s) asociados?`
        )
        if (shouldForce) {
          // Extraer el ID de la URL del request fallido
          const failedUrl = err.config?.url || ''
          const match = failedUrl.match(/\/api\/accounts\/([^?]+)/)
          if (match) {
            deleteMutation.mutate({ id: match[1], force: true })
          }
        }
        return
      }
      toast.error('Error al eliminar', {
        description: errorData?.error || 'Intenta de nuevo',
      })
    },
  })

  const accounts: WhatsAppAccount[] = data?.accounts || []

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAccount.deviceId.trim()) {
      toast.error('El ID del dispositivo es requerido')
      return
    }
    addMutation.mutate(newAccount)
  }

  const openQrDialog = (account: WhatsAppAccount) => {
    setSelectedAccount(account)
    setQrTimestamp(Date.now()) // Forzar nuevo QR al abrir
    setIsQrOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Conexiones"
        subtitle="Gestiona tus cuentas de WhatsApp"
        actions={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Conexión
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar cuenta WhatsApp</DialogTitle>
                <DialogDescription>
                  Conecta una nueva cuenta de WhatsApp para empezar a recibir mensajes.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="deviceId">ID del dispositivo *</Label>
                    <Input
                      id="deviceId"
                      placeholder="ej: mi-whatsapp-1"
                      value={newAccount.deviceId}
                      onChange={(e) =>
                        setNewAccount({ ...newAccount, deviceId: e.target.value })
                      }
                    />
                    <p className="text-xs text-slate-500">
                      Identificador único para esta cuenta (sin espacios)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filial">Filial / Sucursal</Label>
                    <Input
                      id="filial"
                      placeholder="ej: Lima Centro"
                      value={newAccount.filial}
                      onChange={(e) =>
                        setNewAccount({ ...newAccount, filial: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="encargado">Encargado</Label>
                    <Input
                      id="encargado"
                      placeholder="ej: Juan Pérez"
                      value={newAccount.encargado}
                      onChange={(e) =>
                        setNewAccount({ ...newAccount, encargado: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
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
                    Crear y Conectar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Cuentas</CardDescription>
              <CardTitle className="text-3xl">{accounts.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Conectadas</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {accounts.filter((a) => a.status === 'CONNECTED').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pendientes QR</CardDescription>
              <CardTitle className="text-3xl text-blue-600">
                {accounts.filter((a) => a.status === 'SCANNING').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Desconectadas</CardDescription>
              <CardTitle className="text-3xl text-red-600">
                {accounts.filter((a) => a.status === 'DISCONNECTED').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-6 text-center text-red-600">
              Error al cargar las cuentas. Intenta de nuevo.
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && accounts.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Smartphone className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">
                No hay cuentas conectadas
              </h3>
              <p className="text-slate-500 mb-4">
                Agrega tu primera cuenta de WhatsApp para empezar
              </p>
              <Button
                onClick={() => setIsAddOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Conexión
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Accounts Grid */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => {
              const status = statusConfig[account.status]
              const StatusIcon = status.icon

              return (
                <Card key={account.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <Smartphone className="w-6 h-6 text-green-600" />
                          </div>
                          <span
                            className={cn(
                              'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
                              status.dot
                            )}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {account.displayName || account.phoneNumber || account.deviceId}
                          </CardTitle>
                          <CardDescription>
                            {account.phoneNumber || 'Sin número'}
                          </CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {account.status !== 'CONNECTED' && (
                            <DropdownMenuItem onClick={() => openQrDialog(account)}>
                              <QrCode className="w-4 h-4 mr-2" />
                              Ver código QR
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => reconnectMutation.mutate(account.id)}
                            disabled={reconnectMutation.isPending}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reconectar
                          </DropdownMenuItem>
                          {account.status === 'CONNECTED' && (
                            <DropdownMenuItem
                              onClick={() => logoutMutation.mutate(account.id)}
                              disabled={logoutMutation.isPending}
                            >
                              <LogOut className="w-4 h-4 mr-2" />
                              Cerrar sesión
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              if (confirm('¿Eliminar esta cuenta?')) {
                                deleteMutation.mutate({ id: account.id })
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('font-medium', status.color)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>

                    {(account.filial || account.encargado) && (
                      <div className="text-sm text-slate-600 space-y-1">
                        {account.filial && (
                          <p>
                            <span className="text-slate-400">Filial:</span> {account.filial}
                          </p>
                        )}
                        {account.encargado && (
                          <p>
                            <span className="text-slate-400">Encargado:</span>{' '}
                            {account.encargado}
                          </p>
                        )}
                      </div>
                    )}

                    {account.status !== 'CONNECTED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => openQrDialog(account)}
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Escanear QR
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* QR Dialog */}
      <Dialog open={isQrOpen} onOpenChange={(open) => {
        setIsQrOpen(open)
        if (!open) {
          // Limpiar al cerrar
          queryClient.removeQueries({ queryKey: ['account-qr'] })
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear código QR</DialogTitle>
            <DialogDescription>
              Abre WhatsApp en tu teléfono, ve a Dispositivos vinculados y escanea este código.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {qrLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                <span className="ml-2 text-slate-500">Generando QR...</span>
              </div>
            ) : qrData?.qrLink ? (
              <QRImageDisplay 
                qrLink={qrData.qrLink} 
                duration={qrData.duration}
                onRefresh={() => setQrTimestamp(Date.now())}
              />
            ) : qrData?.status === 'CONNECTED' ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-lg font-medium text-green-600">¡Conectado!</p>
                <p className="text-sm text-slate-500">
                  {qrData.phoneNumber || 'Cuenta vinculada exitosamente'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <WifiOff className="w-12 h-12 text-slate-300" />
                <p className="text-slate-500">
                  No se pudo obtener el código QR. Intenta reconectar la cuenta.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedAccount) {
                      reconnectMutation.mutate(selectedAccount.id)
                      setTimeout(() => setQrTimestamp(Date.now()), 2000)
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reconectar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
