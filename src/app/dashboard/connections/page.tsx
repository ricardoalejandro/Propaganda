"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Link2,
    RefreshCw,
    Plus,
    CheckCircle,
    XCircle,
    Loader2,
    QrCode,
    Smartphone,
    Trash2,
    X,
    Clock,
    AlertTriangle,
    Wifi,
    WifiOff
} from "lucide-react"

interface Connection {
    id: string
    name: string
    deviceId: string | null
    jid?: string | null
    displayName?: string
    state: string
    isConnected: boolean
    isLoggedIn: boolean
    createdAt?: string
    updatedAt?: string
}

export default function ConnectionsPage() {
    const [connections, setConnections] = useState<Connection[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [newDeviceName, setNewDeviceName] = useState('')
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [qrExpiry, setQrExpiry] = useState(45)
    const [connecting, setConnecting] = useState(false)
    const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [creatingDevice, setCreatingDevice] = useState(false)

    // Fetch all connections for this account
    const fetchConnections = useCallback(async () => {
        try {
            const res = await fetch('/api/devices')
            const data = await res.json()

            if (data.code === 'SUCCESS' && Array.isArray(data.results)) {
                setConnections(data.results)
            } else if (data.code === 'UNAUTHORIZED') {
                setError('Sesión expirada. Por favor inicia sesión nuevamente.')
                setConnections([])
            } else {
                setConnections([])
            }
        } catch (err) {
            console.error('Error fetching connections:', err)
            setConnections([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchConnections()
        const interval = setInterval(fetchConnections, 10000)
        return () => clearInterval(interval)
    }, [fetchConnections])

    // QR code expiry countdown
    useEffect(() => {
        if (qrCode && qrExpiry > 0) {
            const timer = setTimeout(() => setQrExpiry(prev => prev - 1), 1000)
            return () => clearTimeout(timer)
        } else if (qrExpiry === 0) {
            setQrCode(null)
        }
    }, [qrCode, qrExpiry])

    // Poll for connection status when QR is shown
    useEffect(() => {
        if (!qrCode || !activeConnectionId) return

        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/devices/${activeConnectionId}/status`)
                const data = await res.json()
                if (data.results?.is_logged_in) {
                    setQrCode(null)
                    setShowAddModal(false)
                    setActiveConnectionId(null)
                    setNewDeviceName('')
                    fetchConnections()
                }
            } catch (err) {
                console.error('Error polling status:', err)
            }
        }, 3000)

        return () => clearInterval(pollInterval)
    }, [qrCode, activeConnectionId, fetchConnections])

    // Create new device
    const handleCreateDevice = async () => {
        if (!newDeviceName.trim()) {
            setError('Por favor ingresa un nombre para identificar esta conexión')
            return
        }

        try {
            setCreatingDevice(true)
            setError(null)

            const res = await fetch('/api/devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newDeviceName.trim() })
            })
            const data = await res.json()

            if (data.code === 'SUCCESS' && data.results) {
                // Device created, now get QR
                setActiveConnectionId(data.results.id)
                await handleGetQR(data.results.id)
                fetchConnections()
            } else {
                setError(data.message || 'Error al crear dispositivo')
            }
        } catch (err) {
            console.error('Error creating device:', err)
            setError('Error al crear dispositivo')
        } finally {
            setCreatingDevice(false)
        }
    }

    // Get QR for existing device
    const handleGetQR = async (connectionId: string) => {
        try {
            setConnecting(true)
            setError(null)
            setActiveConnectionId(connectionId)

            const res = await fetch(`/api/devices/${connectionId}/login`)
            const data = await res.json()

            if (data.code === 'SUCCESS' && data.results?.qr_link) {
                setQrCode(data.results.qr_link)
                setQrExpiry(data.results.qr_duration || 45)
            } else if (data.code === 'ALREADY_LOGGED_IN') {
                setError('Este dispositivo ya está conectado')
                fetchConnections()
            } else {
                setError(data.message || 'Error al generar QR')
            }
        } catch (err) {
            console.error('Error getting QR:', err)
            setError('Error al conectar con el servidor')
        } finally {
            setConnecting(false)
        }
    }

    const handleDisconnect = async (connection: Connection) => {
        if (!confirm(`¿Estás seguro de que quieres desconectar "${connection.name}"?`)) return

        try {
            await fetch(`/api/devices/${connection.id}/logout`, { method: 'POST' })
            setTimeout(fetchConnections, 1000)
        } catch (err) {
            console.error('Error disconnecting:', err)
        }
    }

    const handleDelete = async (connection: Connection) => {
        if (!confirm(`¿Estás seguro de que quieres ELIMINAR "${connection.name}"? Esta acción no se puede deshacer.`)) return

        try {
            await fetch(`/api/devices/${connection.id}`, { method: 'DELETE' })
            fetchConnections()
        } catch (err) {
            console.error('Error deleting:', err)
        }
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A'
        return new Date(dateStr).toLocaleString('es-PE')
    }

    const getStateColor = (state: string, isLoggedIn: boolean) => {
        if (isLoggedIn) return 'text-green-600 bg-green-100'
        if (state === 'connecting') return 'text-yellow-600 bg-yellow-100'
        return 'text-gray-600 bg-gray-100'
    }

    const getStateIcon = (state: string, isLoggedIn: boolean) => {
        if (isLoggedIn) return <Wifi className="w-4 h-4" />
        if (state === 'connecting') return <Loader2 className="w-4 h-4 animate-spin" />
        return <WifiOff className="w-4 h-4" />
    }

    return (
        <div className="h-full p-6 bg-gray-50 overflow-auto">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Conexiones WhatsApp</h1>
                        <p className="text-gray-500">Gestiona tus cuentas de WhatsApp conectadas ({connections.length}/100)</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={fetchConnections} variant="outline">
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>
                        <Button
                            onClick={() => {
                                setShowAddModal(true)
                                setError(null)
                                setQrCode(null)
                                setNewDeviceName('')
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={connections.length >= 100}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Conexión
                        </Button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {/* Connections Grid */}
                {loading ? (
                    <div className="flex items-center justify-center p-12 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mr-3" />
                        Cargando conexiones...
                    </div>
                ) : connections.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Smartphone className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            No hay conexiones activas
                        </h3>
                        <p className="text-gray-500 mb-6">
                            Conecta tu primera cuenta de WhatsApp para comenzar a gestionar tus chats
                        </p>
                        <Button
                            onClick={() => setShowAddModal(true)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Conectar WhatsApp
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {connections.map(conn => (
                            <div key={conn.id} className="bg-white rounded-xl shadow-sm border p-6">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStateColor(conn.state, conn.isLoggedIn)}`}>
                                        {getStateIcon(conn.state, conn.isLoggedIn)}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-800">{conn.name}</h3>

                                        <div className={`flex items-center gap-2 mt-1 ${conn.isLoggedIn ? 'text-green-600' : 'text-gray-500'}`}>
                                            {conn.isLoggedIn ? (
                                                <>
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span>Conectado</span>
                                                    {conn.jid && <span className="text-xs text-gray-400">({conn.jid.split('@')[0]})</span>}
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-4 h-4" />
                                                    <span>Desconectado</span>
                                                </>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <span className="font-medium">Estado:</span>
                                                <span className={`text-xs px-2 py-1 rounded ${getStateColor(conn.state, conn.isLoggedIn)}`}>
                                                    {conn.isLoggedIn ? 'Activo' : conn.state || 'Pendiente'}
                                                </span>
                                            </div>
                                            {conn.deviceId && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <span className="font-medium">Device:</span>
                                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                                        {conn.deviceId.substring(0, 8)}...
                                                    </span>
                                                </div>
                                            )}
                                            {conn.createdAt && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Clock className="w-4 h-4" />
                                                    <span>Creado: {formatDate(conn.createdAt)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {conn.isLoggedIn ? (
                                            <Button
                                                variant="outline"
                                                onClick={() => handleDisconnect(conn)}
                                            >
                                                <WifiOff className="w-4 h-4 mr-2" />
                                                Desconectar
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => {
                                                    setShowAddModal(true)
                                                    setActiveConnectionId(conn.id)
                                                    handleGetQR(conn.id)
                                                }}
                                                className="bg-emerald-600 hover:bg-emerald-700"
                                            >
                                                <QrCode className="w-4 h-4 mr-2" />
                                                Conectar
                                            </Button>
                                        )}
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleDelete(conn)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Connection Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-md w-full p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold">
                                    {qrCode ? 'Escanea el QR' : activeConnectionId ? 'Conectar Dispositivo' : 'Nueva Conexión'}
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setShowAddModal(false)
                                        setQrCode(null)
                                        setActiveConnectionId(null)
                                        setError(null)
                                    }}
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            {qrCode ? (
                                <div className="text-center">
                                    <div className="bg-white p-4 rounded-xl inline-block shadow-sm border mb-4">
                                        <img
                                            src={qrCode}
                                            alt="QR Code"
                                            className="w-64 h-64 mx-auto"
                                        />
                                    </div>

                                    <p className="text-sm text-gray-500 mb-2">
                                        Expira en <span className="font-semibold text-orange-600">{qrExpiry}s</span>
                                    </p>

                                    <div className="bg-gray-50 rounded-lg p-4 text-left text-sm space-y-2">
                                        <div className="flex items-start gap-2">
                                            <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
                                            <span>Abre WhatsApp en tu teléfono</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
                                            <span>Ve a Configuración → Dispositivos vinculados</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
                                            <span>Escanea este código QR</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        onClick={() => activeConnectionId && handleGetQR(activeConnectionId)}
                                        className="mt-4"
                                        disabled={connecting}
                                    >
                                        <RefreshCw className={`w-4 h-4 mr-2 ${connecting ? 'animate-spin' : ''}`} />
                                        Actualizar QR
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <QrCode className="w-10 h-10 text-emerald-600" />
                                    </div>

                                    {!activeConnectionId && (
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                                                Nombre de la conexión
                                            </label>
                                            <Input
                                                value={newDeviceName}
                                                onChange={(e) => setNewDeviceName(e.target.value)}
                                                placeholder="Ej: WhatsApp Ventas, Soporte, Personal..."
                                            />
                                            <p className="text-xs text-gray-500 mt-1 text-left">
                                                Este nombre te ayudará a identificar la conexión
                                            </p>
                                        </div>
                                    )}

                                    <Button
                                        onClick={() => activeConnectionId ? handleGetQR(activeConnectionId) : handleCreateDevice()}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                                        disabled={connecting || creatingDevice}
                                    >
                                        {connecting || creatingDevice ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                {creatingDevice ? 'Creando...' : 'Generando QR...'}
                                            </>
                                        ) : (
                                            <>
                                                <QrCode className="w-4 h-4 mr-2" />
                                                {activeConnectionId ? 'Generar QR' : 'Crear y Conectar'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-700">
                        <strong>💡 Multi-cuenta:</strong> Puedes conectar hasta 100 cuentas de WhatsApp para gestionar 
                        diferentes líneas de negocio o departamentos. Cada conexión es independiente y sus chats 
                        se guardan localmente para acceso offline.
                    </p>
                </div>
            </div>
        </div>
    )
}
