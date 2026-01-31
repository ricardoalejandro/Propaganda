"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Building2,
    Plus,
    Search,
    Users,
    Trash2,
    Edit,
    RefreshCw,
    X,
    ArrowLeft
} from "lucide-react"
import { useRouter } from "next/navigation"

interface Account {
    id: string
    name: string
    slug: string
    createdAt: string
    _count?: {
        users: number
    }
}

export default function AdminPage() {
    const router = useRouter()
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState('')

    // Form state
    const [newAccount, setNewAccount] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        displayName: ''
    })

    const fetchAccounts = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/accounts')
            const data = await res.json()
            if (data.success) {
                setAccounts(data.accounts)
            }
        } catch (err) {
            console.error('Error fetching accounts:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAccounts()
    }, [fetchAccounts])

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setCreating(true)

        try {
            const res = await fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAccount)
            })
            const data = await res.json()

            if (!data.success) {
                setError(data.error || 'Error al crear cuenta')
                return
            }

            setShowCreateModal(false)
            setNewAccount({ name: '', username: '', email: '', password: '', displayName: '' })
            fetchAccounts()
        } catch {
            setError('Error de conexión')
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteAccount = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta cuenta? Esta acción no se puede deshacer.')) return

        try {
            const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                fetchAccounts()
            }
        } catch (err) {
            console.error('Error deleting account:', err)
        }
    }

    const filteredAccounts = accounts.filter(acc =>
        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.slug.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="h-full p-6 bg-gray-50 overflow-auto">
            <div className="max-w-5xl mx-auto">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard')}
                    className="mb-4 text-gray-600 hover:text-gray-800"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Dashboard
                </Button>

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Panel de Administración</h1>
                        <p className="text-gray-500">Gestiona cuentas y usuarios del sistema</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchAccounts}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Cuenta
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-md mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar cuentas..."
                        className="pl-10"
                    />
                </div>

                {/* Accounts List */}
                <div className="bg-white rounded-xl shadow-sm border">
                    <div className="grid grid-cols-12 gap-4 p-4 border-b bg-gray-50 font-medium text-sm text-gray-600">
                        <div className="col-span-4">Cuenta</div>
                        <div className="col-span-3">Slug</div>
                        <div className="col-span-2">Usuarios</div>
                        <div className="col-span-3">Acciones</div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">
                            Cargando cuentas...
                        </div>
                    ) : filteredAccounts.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {searchTerm ? 'No se encontraron cuentas' : 'No hay cuentas creadas'}
                        </div>
                    ) : (
                        filteredAccounts.map(account => (
                            <div key={account.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-b-0 items-center hover:bg-gray-50">
                                <div className="col-span-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <span className="font-medium text-gray-800">{account.name}</span>
                                </div>
                                <div className="col-span-3 text-gray-600">
                                    {account.slug}
                                </div>
                                <div className="col-span-2 flex items-center gap-1 text-gray-600">
                                    <Users className="w-4 h-4" />
                                    {account._count?.users || 0}
                                </div>
                                <div className="col-span-3 flex gap-2">
                                    <Button variant="outline" size="sm">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteAccount(account.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Account Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold">Nueva Cuenta</h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleCreateAccount} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre de la cuenta
                                </label>
                                <Input
                                    value={newAccount.name}
                                    onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Mi Empresa"
                                    required
                                />
                            </div>

                            <hr />
                            <p className="text-sm text-gray-500">Usuario principal de la cuenta:</p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre del usuario
                                </label>
                                <Input
                                    value={newAccount.displayName}
                                    onChange={(e) => setNewAccount(prev => ({ ...prev, displayName: e.target.value }))}
                                    placeholder="Juan Pérez"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Usuario de sistema
                                </label>
                                <Input
                                    value={newAccount.username}
                                    onChange={(e) => setNewAccount(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                                    placeholder="juanperez"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Correo electrónico
                                </label>
                                <Input
                                    type="email"
                                    value={newAccount.email}
                                    onChange={(e) => setNewAccount(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="juan@empresa.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contraseña
                                </label>
                                <Input
                                    type="password"
                                    value={newAccount.password}
                                    onChange={(e) => setNewAccount(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                    disabled={creating}
                                >
                                    {creating ? 'Creando...' : 'Crear Cuenta'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
