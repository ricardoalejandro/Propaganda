"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
    X,
    Trash2,
    CheckSquare,
    Square,
    HardDrive,
    Image as ImageIcon,
    Video,
    Music,
    FileText,
    Loader2,
    RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MediaFile {
    id: string
    filename: string
    type: 'image' | 'video' | 'audio' | 'document'
    size: number
    createdAt: string
}

interface MediaManagerProps {
    isOpen: boolean
    onClose: () => void
}

export function MediaManager({ isOpen, onClose }: MediaManagerProps) {
    const [files, setFiles] = useState<MediaFile[]>([])
    const [totalSize, setTotalSize] = useState(0)
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    }

    const loadFiles = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/media')
            const data = await response.json()
            if (data.code === 'SUCCESS') {
                setFiles(data.results.files)
                setTotalSize(data.results.totalSize)
            }
        } catch (err) {
            console.error('Error loading media files:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (isOpen) {
            loadFiles()
            setSelectedIds(new Set())
        }
    }, [isOpen, loadFiles])

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    const selectAll = () => {
        if (selectedIds.size === files.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(files.map(f => f.id)))
        }
    }

    const deleteSelected = async () => {
        if (selectedIds.size === 0) return

        const confirmed = confirm(`¿Eliminar ${selectedIds.size} archivo(s)? Esta acción no se puede deshacer.`)
        if (!confirmed) return

        setDeleting(true)
        try {
            const response = await fetch('/api/media', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileIds: Array.from(selectedIds) })
            })
            const data = await response.json()
            if (data.code === 'SUCCESS') {
                // Reload files
                await loadFiles()
                setSelectedIds(new Set())
            } else {
                alert('Error al eliminar archivos')
            }
        } catch (err) {
            console.error('Error deleting files:', err)
            alert('Error al eliminar archivos')
        } finally {
            setDeleting(false)
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'image': return <ImageIcon className="w-5 h-5 text-purple-500" />
            case 'video': return <Video className="w-5 h-5 text-red-500" />
            case 'audio': return <Music className="w-5 h-5 text-blue-500" />
            default: return <FileText className="w-5 h-5 text-gray-500" />
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-3">
                        <HardDrive className="w-6 h-6 text-emerald-600" />
                        <div>
                            <h2 className="text-lg font-semibold">Almacenamiento de Medios</h2>
                            <p className="text-sm text-gray-500">
                                {files.length} archivos · {formatSize(totalSize)} usados
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-2 p-3 border-b bg-gray-50">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAll}
                        className="text-xs"
                    >
                        {selectedIds.size === files.length && files.length > 0 ? (
                            <>
                                <CheckSquare className="w-4 h-4 mr-1" />
                                Deseleccionar todo
                            </>
                        ) : (
                            <>
                                <Square className="w-4 h-4 mr-1" />
                                Seleccionar todo
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadFiles}
                        disabled={loading}
                        className="text-xs"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />
                        Actualizar
                    </Button>

                    {selectedIds.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={deleteSelected}
                            disabled={deleting}
                            className="ml-auto text-xs"
                        >
                            {deleting ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4 mr-1" />
                            )}
                            Eliminar ({selectedIds.size})
                        </Button>
                    )}
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                        </div>
                    ) : files.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <HardDrive className="w-12 h-12 mb-2" />
                            <p>No hay archivos multimedia almacenados</p>
                            <p className="text-sm">Los medios se descargarán automáticamente</p>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {files.map(file => (
                                <div
                                    key={file.id}
                                    onClick={() => toggleSelect(file.id)}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                        selectedIds.has(file.id)
                                            ? "bg-emerald-50 border border-emerald-200"
                                            : "bg-gray-50 hover:bg-gray-100 border border-transparent"
                                    )}
                                >
                                    {/* Checkbox */}
                                    <div className={cn(
                                        "w-5 h-5 rounded border-2 flex items-center justify-center",
                                        selectedIds.has(file.id)
                                            ? "bg-emerald-500 border-emerald-500"
                                            : "border-gray-300"
                                    )}>
                                        {selectedIds.has(file.id) && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>

                                    {/* Thumbnail / Icon */}
                                    <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {file.type === 'image' ? (
                                            <img
                                                src={`/api/media/${file.id}`}
                                                alt={file.filename}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                                }}
                                            />
                                        ) : null}
                                        <div className={cn(file.type === 'image' && 'hidden')}>
                                            {getTypeIcon(file.type)}
                                        </div>
                                    </div>

                                    {/* File Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{file.filename}</p>
                                        <p className="text-xs text-gray-500">
                                            {formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>

                                    {/* Type Badge */}
                                    <span className={cn(
                                        "text-xs px-2 py-0.5 rounded-full",
                                        file.type === 'image' && "bg-purple-100 text-purple-700",
                                        file.type === 'video' && "bg-red-100 text-red-700",
                                        file.type === 'audio' && "bg-blue-100 text-blue-700",
                                        file.type === 'document' && "bg-gray-100 text-gray-700"
                                    )}>
                                        {file.type}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>
                            {selectedIds.size > 0
                                ? `${selectedIds.size} seleccionado(s) · ${formatSize(
                                    files.filter(f => selectedIds.has(f.id)).reduce((sum, f) => sum + f.size, 0)
                                )}`
                                : `Total: ${formatSize(totalSize)}`
                            }
                        </span>
                        <Button variant="outline" size="sm" onClick={onClose}>
                            Cerrar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
