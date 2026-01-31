"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Users, Plus, Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"

import useSWR from 'swr'

// Fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json())

const stages = [
    { id: 'new', label: 'Nuevos', color: 'bg-gray-100' },
    { id: 'contacted', label: 'Contactados', color: 'bg-blue-100' },
    { id: 'qualified', label: 'Calificados', color: 'bg-yellow-100' },
    { id: 'won', label: 'Ganados', color: 'bg-green-100' },
    { id: 'lost', label: 'Perdidos', color: 'bg-red-100' },
]

export default function LeadsPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const { data, isLoading } = useSWR('/api/leads', fetcher)
    const leads: any[] = data?.results || []

    const filteredLeads = leads.filter(lead =>
        (lead.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phone || '').includes(searchTerm)
    )

    return (
        <div className="h-full p-6 bg-gray-50 overflow-auto">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Leads</h1>
                        <p className="text-gray-500">Gestiona tus prospectos y oportunidades</p>
                    </div>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Lead
                    </Button>
                </div>

                {/* Search and Filter */}
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar leads..."
                            className="pl-10"
                        />
                    </div>
                    <Button variant="outline">
                        <Filter className="w-4 h-4 mr-2" />
                        Filtros
                    </Button>
                </div>

                {/* Kanban Board */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {stages.map(stage => {
                        const stageLeads = filteredLeads.filter(l => l.stage === stage.id)
                        return (
                            <div key={stage.id} className={`rounded-xl p-4 ${stage.color}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-700">{stage.label}</h3>
                                    <span className="text-sm text-gray-500">{stageLeads.length}</span>
                                </div>
                                <div className="space-y-3">
                                    {stageLeads.map(lead => (
                                        <div key={lead.id} className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                                    <Users className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-800 truncate">{lead.name}</p>
                                                    <p className="text-sm text-gray-500 truncate">{lead.phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {stageLeads.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-4">
                                            Sin leads
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Info */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                        <strong>Nota:</strong> Los leads se crean automáticamente cuando recibes mensajes de contactos nuevos. Puedes editar sus detalles en el panel de chat o aquí próximamente.
                    </p>
                </div>
            </div>
        </div>
    )
}
