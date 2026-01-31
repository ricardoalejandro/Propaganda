"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageSquare, Lock, User } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })

            const data = await response.json()

            if (!data.success) {
                setError(data.error || 'Error al iniciar sesión')
                return
            }

            // Redirect to dashboard
            router.push('/dashboard')
            router.refresh()
        } catch {
            setError('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
                        <MessageSquare className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Propaganda</h1>
                    <p className="text-emerald-100 mt-2">Sistema de Gestión de Comunicaciones</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                        Iniciar Sesión
                    </h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Usuario
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Ingresa tu usuario"
                                    className="pl-10"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Ingresa tu contraseña"
                                    className="pl-10"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white py-6"
                        disabled={loading}
                    >
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </Button>
                </form>

                <p className="text-center text-emerald-100 mt-6 text-sm">
                    © 2026 Propaganda. Todos los derechos reservados.
                </p>
            </div>
        </div>
    )
}
