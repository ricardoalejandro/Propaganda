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
    Clock
} from "lucide-react"

interface Connection {
    id: string
    name: string
    phoneNumber?: string
    deviceId: string
    isConnected: boolean
    isLoggedIn: boolean
    connectedAt?: string
    lastSeen?: string
}

export default function ConnectionsPage() {
    const [connections, setConnections] = useState<Connection[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [newDeviceName, setNewDeviceName] = useState('')
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [qrExpiry, setQrExpiry] = useState(45)
    const [connecting, setConnecting] = useState(false)
    const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)

    // Fetch all connection statuses
    const fetchConnections = useCallback(async () => {
        try {
            // Get devices from API
            const res = await fetch('/api/status')
            const data = await res.json()

            if (Array.isArray(data.results)) {
                // Map API devices to Connection interface
                const devices = data.results.map((dev: any, index: number) => ({
                    id: dev.device || `dev-${index}`,
                    name: dev.name || 'WhatsApp Device',
                    deviceId: dev.device,
                    isConnected: true, // If listed, it's registered
                    isLoggedIn: true,
                    phoneNumber: dev.device.split(':')[0],
                    lastSeen: new Date().toISOString()
                }))
                setConnections(devices)
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
        if (!qrCode || !activeDeviceId) return

        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch('/api/status')
                const data = await res.json()
                if (data.results?.is_logged_in) {
                    setQrCode(null)
                    setShowAddModal(false)
                    setActiveDeviceId(null)
                    fetchConnections()
                }
            } catch (err) {
                console.error('Error polling status:', err)
            }
        }, 3000)

        return () => clearInterval(pollInterval)
    }, [qrCode, activeDeviceId, fetchConnections])

    const handleConnect = async () => {
        if (!newDeviceName.trim()) {
            alert('Por favor ingresa un nombre para identificar esta conexión')
            return
        }

        try {
            setConnecting(true)
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceName: newDeviceName })
            })
            const data = await res.json()

            if (res.status === 400 && data.code === 'ALREADY_LOGGED_IN') {
                alert(data.message)
                return
            }

            if (data.results?.qr_link) {
                setQrCode(data.results.qr_link)
                setQrExpiry(45)
                setActiveDeviceId(data.results.device_id || 'default')
            } else if (data.code === 'ERROR') {
                alert('Error: ' + data.message)
            }
        } catch (err) {
            console.error('Error initiating connection:', err)
            alert('Error al conectar. Verifica que el servidor de difusion esté activo.')
        } finally {
            setConnecting(false)
        }
    }

    const handleDisconnect = async (connection: Connection) => {
        if (!confirm(`¿Estás seguro de que quieres desconectar ${connection.name}?`)) return

        try {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId: connection.deviceId })
            })
            // Wait a bit for backend to process
            setTimeout(fetchConnections, 1000)
        } catch (err) {
            console.error('Error disconnecting:', err)
        }
    }

    const refreshQR = async () => {
        await handleConnect()
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A'
        return new Date(dateStr).toLocaleString('es-PE')
    }

    return (
        <div className="h-full p-6 bg-gray-50 overflow-auto">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Conexiones WhatsApp</h1>
                        <p className="text-gray-500">Gestiona tus cuentas de WhatsApp conectadas</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={fetchConnections} variant="outline">
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>
                        <Button
                            onClick={() => setShowAddModal(true)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Conexión
                        </Button>
                    </div>
                </div>

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
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${conn.isLoggedIn ? 'bg-green-100' : 'bg-red-100'
                                        }`}>
                                        <Link2 className={`w-6 h-6 ${conn.isLoggedIn ? 'text-green-600' : 'text-red-600'
                                            }`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-800">{conn.name}</h3>

                                        <div className={`flex items-center gap-2 mt-1 ${conn.isLoggedIn ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {conn.isLoggedIn ? (
                                                <>
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span>Conectado</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-4 h-4" />
                                                    <span>Desconectado</span>
                                                </>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                                            {conn.phoneNumber && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Smartphone className="w-4 h-4" />
                                                    <span>{conn.phoneNumber}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <span className="font-medium">Device:</span>
                                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                    {conn.deviceId}
                                                </span>
                                            </div>
                                            {conn.connectedAt && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Clock className="w-4 h-4" />
                                                    <span>Conectado: {formatDate(conn.connectedAt)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {conn.isLoggedIn ? (
                                            <Button
                                                variant="destructive"
                                                onClick={() => handleDisconnect(conn)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Desconectar
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => {
                                                    setShowAddModal(true)
                                                    handleConnect()
                                                }}
                                                className="bg-emerald-600 hover:bg-emerald-700"
                                            >
                                                <QrCode className="w-4 h-4 mr-2" />
                                                Reconectar
                                            </Button>
                                        )}
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
                                <h2 className="text-xl font-semibold">Conectar WhatsApp</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setShowAddModal(false)
                                        setQrCode(null)
                                    }}
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

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
                                            <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
                                            <span>Abre WhatsApp en tu teléfono</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
                                            <span>Ve a Configuración → Dispositivos vinculados</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">3</span>
                                            <span>Escanea este código QR</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        onClick={refreshQR}
                                        className="mt-4"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Actualizar QR
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <QrCode className="w-10 h-10 text-emerald-600" />
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                                            Nombre de la conexión (opcional)
                                        </label>
                                        <Input
                                            value={newDeviceName}
                                            onChange={(e) => setNewDeviceName(e.target.value)}
                                            placeholder="Ej: WhatsApp Ventas"
                                        />
                                    </div>

                                    <Button
                                        onClick={handleConnect}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                                        disabled={connecting}
                                    >
                                        {connecting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Generando QR...
                                            </>
                                        ) : (
                                            <>
                                                <QrCode className="w-4 h-4 mr-2" />
                                                Generar Código QR
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Future multi-connection info */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-700">
                        <strong>💡 Tip:</strong> Puedes conectar múltiples cuentas de WhatsApp para gestionar
                        diferentes líneas de negocio o departamentos desde un solo panel.
                    </p>
                </div>
            </div>
        </div>
    )
}
