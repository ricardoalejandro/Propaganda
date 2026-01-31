"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User, Bell, Shield, Save } from "lucide-react"

interface UserInfo {
    displayName: string
    email: string
    username: string
    accountName: string | null
}

export default function ConfigPage() {
    const [user, setUser] = useState<UserInfo | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('/api/auth/session')
                const data = await res.json()
                if (data.authenticated) {
                    setUser(data.user)
                }
            } catch (err) {
                console.error('Error fetching user:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchUser()
    }, [])

    return (
        <div className="h-full p-6 bg-gray-50 overflow-auto">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Configuración</h1>
                    <p className="text-gray-500">Personaliza tu cuenta y preferencias</p>
                </div>

                {/* Profile Section */}
                <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <User className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-800">Perfil</h2>
                    </div>

                    {loading ? (
                        <p className="text-gray-500">Cargando...</p>
                    ) : user ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre para mostrar
                                </label>
                                <Input defaultValue={user.displayName} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Correo electrónico
                                </label>
                                <Input defaultValue={user.email} type="email" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Usuario
                                </label>
                                <Input value={user.username} disabled className="bg-gray-50" />
                            </div>
                            {user.accountName && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cuenta
                                    </label>
                                    <Input value={user.accountName} disabled className="bg-gray-50" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500">No se pudo cargar la información</p>
                    )}
                </div>

                {/* Notifications Section */}
                <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Bell className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-800">Notificaciones</h2>
                    </div>
                    <div className="space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded" defaultChecked />
                            <span className="text-gray-700">Notificaciones de nuevos mensajes</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded" defaultChecked />
                            <span className="text-gray-700">Notificaciones de nuevos leads</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded" />
                            <span className="text-gray-700">Resumen diario por email</span>
                        </label>
                    </div>
                </div>

                {/* Security Section */}
                <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Shield className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-800">Seguridad</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contraseña actual
                            </label>
                            <Input type="password" placeholder="••••••••" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nueva contraseña
                            </label>
                            <Input type="password" placeholder="••••••••" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirmar nueva contraseña
                            </label>
                            <Input type="password" placeholder="••••••••" />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                        <Save className="w-4 h-4 mr-2" />
                        Guardar cambios
                    </Button>
                </div>
            </div>
        </div>
    )
}
