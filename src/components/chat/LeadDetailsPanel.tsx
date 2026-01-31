import { useState } from 'react'
import useSWR from 'swr'
import { User, Phone, Mail, MapPin, Tag, FileText, X, AlertCircle, Save } from 'lucide-react'

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
})

interface LeadDetailsPanelProps {
    jid: string
    onClose: () => void
}

export function LeadDetailsPanel({ jid, onClose }: LeadDetailsPanelProps) {
    const { data: lead, error, mutate, isLoading } = useSWR(`/api/leads/by-jid/${encodeURIComponent(jid)}`, fetcher)
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState<any>({})
    const [saving, setSaving] = useState(false)

    // Form fields configuration
    const fields = [
        { key: 'name', label: 'Nombre', icon: User, type: 'text' },
        { key: 'phone', label: 'Teléfono', icon: Phone, type: 'tel', disabled: true }, // Phone usually not editable from JID
        { key: 'email', label: 'Email', icon: Mail, type: 'email' },
        { key: 'address', label: 'Dirección', icon: MapPin, type: 'text' },
        { key: 'stage', label: 'Etapa', icon: Tag, type: 'select', options: ['new', 'contacted', 'qualified', 'proposal', 'closed'] },
        { key: 'notes', label: 'Notas', icon: FileText, type: 'textarea' },
    ]

    const handleEdit = () => {
        setFormData({
            ...lead,
            phone: lead.phone || jid.split('@')[0] // Fallback
        })
        setIsEditing(true)
    }

    const handleCancel = () => {
        setIsEditing(false)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/leads/by-jid/${encodeURIComponent(jid)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!res.ok) throw new Error('Failed to save')

            await mutate() // Refresh data
            setIsEditing(false)
        } catch (err) {
            console.error(err)
            alert('Error al guardar cambios')
        } finally {
            setSaving(false)
        }
    }

    if (isLoading) return <div className="w-80 border-l bg-gray-50 p-4 flex justify-center items-center">Cargando...</div>
    if (error) return <div className="w-80 border-l bg-red-50 p-4 text-red-500">Error cargando lead</div>
    if (!lead) return <div className="w-80 border-l bg-gray-50 p-4">Lead no encontrado</div>

    return (
        <div className="w-80 border-l bg-white h-full flex flex-col shadow-xl z-20">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-gray-700">Info. del Contacto</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Profile Header */}
                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 text-2xl font-bold mb-3">
                        {lead.name?.charAt(0) || '?'}
                    </div>
                    {!isEditing && (
                        <h2 className="text-lg font-bold text-gray-800 text-center">{lead.name || 'Sin Nombre'}</h2>
                    )}
                </div>

                {/* Fields */}
                <div className="space-y-4">
                    {fields.map((field) => (
                        <div key={field.key} className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                <field.icon size={12} /> {field.label}
                            </label>

                            {isEditing ? (
                                field.type === 'textarea' ? (
                                    <textarea
                                        value={formData[field.key] || ''}
                                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                        className="w-full text-sm border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        rows={4}
                                    />
                                ) : field.type === 'select' ? (
                                    <select
                                        value={formData[field.key] || 'new'}
                                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                        className="w-full text-sm border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        {field.options?.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={field.type}
                                        value={formData[field.key] || ''}
                                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                        disabled={field.disabled}
                                        className="w-full text-sm border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                                    />
                                )
                            ) : (
                                <div className={`text-sm text-gray-800 break-words ${!lead[field.key] && 'text-gray-400 italic'}`}>
                                    {lead[field.key] || 'Sin asignar'}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Custom Fields Placeholder */}
                <div className="pt-4 border-t">
                    <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Campos Personalizados</h4>
                    <p className="text-xs text-gray-400 italic">Próximamente...</p>
                </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t bg-gray-50">
                {isEditing ? (
                    <div className="flex gap-2">
                        <button
                            onClick={handleCancel}
                            className="flex-1 py-2 px-3 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {saving ? 'Guardando...' : <><Save size={16} /> Guardar</>}
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleEdit}
                        className="w-full py-2 px-4 bg-white border border-blue-200 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
                    >
                        Editar Información
                    </button>
                )}
            </div>
        </div>
    )
}
