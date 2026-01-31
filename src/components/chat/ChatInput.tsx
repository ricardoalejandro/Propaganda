"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { EmojiPicker } from "./EmojiPicker"
import { AudioRecorder } from "./AudioRecorder"
import {
    Send,
    Paperclip,
    Image as ImageIcon,
    FileText,
    Video as VideoIcon,
    Loader2,
    X
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
    onSendMessage: (message: string) => Promise<void>
    onSendImage: (file: File, caption?: string) => Promise<void>
    onSendFile: (file: File) => Promise<void>
    onSendAudio: (blob: Blob) => Promise<void>
    onSendVideo: (file: File, caption?: string) => Promise<void>
    disabled?: boolean
    disabledReason?: string
}

interface PendingMedia {
    type: 'image' | 'video' | 'file'
    file: File
    preview?: string
}

export function ChatInput({
    onSendMessage,
    onSendImage,
    onSendFile,
    onSendAudio,
    onSendVideo,
    disabled = false,
    disabledReason
}: ChatInputProps) {
    const [message, setMessage] = useState("")
    const [sending, setSending] = useState(false)
    const [showAttachMenu, setShowAttachMenu] = useState(false)
    const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null)

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoInputRef = useRef<HTMLInputElement>(null)
    const attachMenuRef = useRef<HTMLDivElement>(null)

    // Auto-resize textarea
    const adjustTextareaHeight = useCallback(() => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = 'auto'
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
        }
    }, [])

    // Handle message change
    const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value)
        adjustTextareaHeight()
    }

    // Handle emoji select
    const handleEmojiSelect = (emoji: string) => {
        const textarea = textareaRef.current
        if (textarea) {
            const start = textarea.selectionStart
            const end = textarea.selectionEnd
            const newMessage = message.slice(0, start) + emoji + message.slice(end)
            setMessage(newMessage)

            // Set cursor position after emoji
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + emoji.length
                textarea.focus()
            }, 0)
        } else {
            setMessage(prev => prev + emoji)
        }
    }

    // Handle send
    const handleSend = async () => {
        if (sending) return

        setSending(true)
        try {
            if (pendingMedia) {
                const caption = message.trim()
                switch (pendingMedia.type) {
                    case 'image':
                        await onSendImage(pendingMedia.file, caption || undefined)
                        break
                    case 'video':
                        await onSendVideo(pendingMedia.file, caption || undefined)
                        break
                    case 'file':
                        await onSendFile(pendingMedia.file)
                        break
                }
                setPendingMedia(null)
                setMessage("")
            } else if (message.trim()) {
                await onSendMessage(message.trim())
                setMessage("")
            }

            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
            }
        } finally {
            setSending(false)
            textareaRef.current?.focus()
        }
    }

    // Handle key down
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Handle paste for images
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return

        // Convert to array for iteration
        const itemsArray = Array.from(items)
        for (const item of itemsArray) {
            if (item.type.startsWith('image/')) {
                e.preventDefault()
                const file = item.getAsFile()
                if (file) {
                    const preview = URL.createObjectURL(file)
                    setPendingMedia({ type: 'image', file, preview })
                }
                break
            }
        }
    }

    // Handle file selection
    const handleFileSelect = (type: 'image' | 'video' | 'file') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (type === 'image' || type === 'video') {
            const preview = URL.createObjectURL(file)
            setPendingMedia({ type, file, preview })
        } else {
            setPendingMedia({ type, file })
        }

        setShowAttachMenu(false)
        e.target.value = '' // Reset input
    }

    // Handle audio recording complete
    const handleAudioRecording = async (blob: Blob) => {
        setSending(true)
        try {
            await onSendAudio(blob)
        } finally {
            setSending(false)
        }
    }

    // Clear pending media
    const clearPendingMedia = () => {
        if (pendingMedia?.preview) {
            URL.revokeObjectURL(pendingMedia.preview)
        }
        setPendingMedia(null)
    }

    const canSend = (message.trim() || pendingMedia) && !sending

    return (
        <div className="bg-white border-t">
            {/* Disabled reason message */}
            {disabled && disabledReason && (
                <div className="px-4 py-2 bg-amber-50 text-amber-700 text-sm text-center border-b">
                    ⚠️ {disabledReason}
                </div>
            )}

            {/* Pending media preview */}
            {pendingMedia && (
                <div className="p-3 border-b bg-gray-50">
                    <div className="flex items-start gap-3">
                        {pendingMedia.preview ? (
                            <div className="relative">
                                {pendingMedia.type === 'image' ? (
                                    <img
                                        src={pendingMedia.preview}
                                        alt="Preview"
                                        className="w-20 h-20 object-cover rounded"
                                    />
                                ) : (
                                    <video
                                        src={pendingMedia.preview}
                                        className="w-20 h-20 object-cover rounded"
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                <FileText className="w-6 h-6 text-gray-500" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{pendingMedia.file.name}</p>
                            <p className="text-xs text-gray-500">
                                {(pendingMedia.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={clearPendingMedia}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Input area */}
            <div className="p-3 flex items-end gap-2">
                {/* Emoji picker */}
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />

                {/* Attachment menu */}
                <div className="relative" ref={attachMenuRef}>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    >
                        <Paperclip className="w-5 h-5" />
                    </Button>

                    {showAttachMenu && (
                        <div className="absolute bottom-12 left-0 bg-white rounded-lg shadow-lg border p-2 z-50 min-w-[150px]">
                            <button
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 rounded"
                                onClick={() => imageInputRef.current?.click()}
                            >
                                <ImageIcon className="w-4 h-4 text-purple-500" />
                                Imagen
                            </button>
                            <button
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 rounded"
                                onClick={() => videoInputRef.current?.click()}
                            >
                                <VideoIcon className="w-4 h-4 text-red-500" />
                                Video
                            </button>
                            <button
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 rounded"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FileText className="w-4 h-4 text-blue-500" />
                                Documento
                            </button>
                        </div>
                    )}

                    {/* Hidden file inputs */}
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleFileSelect('image')}
                    />
                    <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/3gpp,video/quicktime"
                        className="hidden"
                        onChange={handleFileSelect('video')}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                        className="hidden"
                        onChange={handleFileSelect('file')}
                    />
                </div>

                {/* Text input */}
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleMessageChange}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder="Escribe un mensaje..."
                        rows={1}
                        disabled={disabled || sending}
                        className={cn(
                            "w-full resize-none rounded-2xl border border-gray-300 px-4 py-2",
                            "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
                            "max-h-[120px] text-sm",
                            (disabled || sending) && "opacity-50 cursor-not-allowed"
                        )}
                    />
                </div>

                {/* Audio recorder or Send button */}
                {message.trim() || pendingMedia ? (
                    <Button
                        onClick={handleSend}
                        disabled={!canSend}
                        className="bg-emerald-500 hover:bg-emerald-600 rounded-full h-10 w-10 p-0"
                    >
                        {sending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </Button>
                ) : (
                    <AudioRecorder
                        onRecordingComplete={handleAudioRecording}
                        disabled={disabled || sending}
                    />
                )}
            </div>
        </div>
    )
}
