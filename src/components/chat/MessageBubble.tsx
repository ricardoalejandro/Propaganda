"use client"

import { Message } from "@/lib/difusion"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CheckCheck, FileText, Play, Mic, User, AlertCircle } from "lucide-react"
import { formatMessage } from "@/lib/formatWhatsAppText"
import { useState, useEffect, useRef } from "react"

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isMe = message.is_from_me
  const time = format(new Date(message.timestamp), "HH:mm")
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState(false)
  const [mediaExpired, setMediaExpired] = useState(false)
  const downloadAttempted = useRef(false)

  // Download media to local storage when component mounts
  useEffect(() => {
    if (!message.media_type || !message.url) return

    // Check if URL is already local
    if (message.url.startsWith('/api/media/')) {
      setLocalUrl(message.url)
      return
    }

    // Only attempt download once per message
    if (downloadAttempted.current) return
    downloadAttempted.current = true

    // Try to download and cache the media
    const downloadMedia = async () => {
      try {
        const response = await fetch('/api/media/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: message.url,
            messageId: message.id,
            filename: message.filename
          })
        })

        const data = await response.json()

        if (data.code === 'SUCCESS' && data.results?.localPath) {
          setLocalUrl(data.results.localPath)
        } else if (data.code === 'EXPIRED' || data.results?.expired) {
          // URL has expired, mark as unavailable
          setMediaExpired(true)
          setDownloadError(true)
        } else {
          // Other error, try using original URL (might work for new messages)
          setLocalUrl(message.url)
        }
      } catch {
        // Network error, try original URL
        setLocalUrl(message.url)
      }
    }

    downloadMedia()
  }, [message.id, message.media_type, message.url, message.filename])

  // Get the URL to use (prefer local, fallback to original)
  const mediaUrl = localUrl
    ? `${localUrl}?v=2` // Force cache bust for previously failed attempts
    : message.url

  // Handle image error (URL expired)
  const handleImageError = () => {
    setImageLoaded(true)
    setDownloadError(true)
  }

  // Render media content
  const renderMedia = () => {
    if (!message.media_type) return null

    switch (message.media_type) {
      case 'image':
        return (
          <>
            <div
              className="relative cursor-pointer mb-1 rounded overflow-hidden"
              onClick={() => !downloadError && setShowLightbox(true)}
            >
              {!imageLoaded && (
                <div className="w-48 h-32 bg-gray-200 animate-pulse rounded flex items-center justify-center">
                  <span className="text-gray-400 text-xs">Cargando...</span>
                </div>
              )}
              {downloadError ? (
                <div className="w-48 h-32 bg-gray-200 rounded flex flex-col items-center justify-center text-gray-400">
                  <AlertCircle className="w-8 h-8 mb-1" />
                  <span className="text-xs">{mediaExpired ? "Imagen expirada" : "Imagen no disponible"}</span>
                </div>
              ) : (
                <img
                  src={mediaUrl}
                  alt={message.filename || "Imagen"}
                  className={cn(
                    "max-w-[250px] max-h-[300px] rounded object-cover",
                    !imageLoaded && "hidden"
                  )}
                  onLoad={() => setImageLoaded(true)}
                  onError={handleImageError}
                />
              )}
            </div>
            {/* Lightbox */}
            {showLightbox && !downloadError && (
              <div
                className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                onClick={() => setShowLightbox(false)}
              >
                <img
                  src={mediaUrl}
                  alt={message.filename || "Imagen"}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          </>
        )

      case 'video':
        return (
          <div className="relative mb-1">
            <video
              src={mediaUrl}
              controls
              className="max-w-[250px] max-h-[300px] rounded"
              preload="metadata"
            >
              Tu navegador no soporta video
            </video>
            <div className={cn(
              "absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-xs",
              isMe ? "bg-emerald-700" : "bg-gray-200"
            )}>
              <Play className="w-3 h-3" />
              Video
            </div>
          </div>
        )

      case 'audio':
      case 'ptt': // Voice note
        return (
          <div className="mb-1">
            <audio src={mediaUrl} controls className="max-w-[220px]">
              Tu navegador no soporta audio
            </audio>
            {message.media_type === 'ptt' && (
              <div className={cn(
                "flex items-center gap-1 text-xs mt-1",
                isMe ? "text-emerald-200" : "text-gray-500"
              )}>
                <Mic className="w-3 h-3" />
                Nota de voz
              </div>
            )}
          </div>
        )

      case 'document':
        return (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 p-2 rounded mb-1",
              isMe ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-100 hover:bg-gray-200"
            )}
          >
            <FileText className={cn("w-8 h-8", isMe ? "text-white" : "text-gray-600")} />
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                isMe ? "text-white" : "text-gray-900"
              )}>
                {message.filename || "Documento"}
              </p>
              <p className={cn(
                "text-xs",
                isMe ? "text-emerald-200" : "text-gray-500"
              )}>
                {message.file_length ? `${(message.file_length / 1024).toFixed(1)} KB` : "Documento"}
              </p>
            </div>
          </a>
        )

      case 'sticker':
        return (
          <img
            src={mediaUrl}
            alt="Sticker"
            className="max-w-[150px] max-h-[150px]"
          />
        )

      case 'contact':
        return (
          <div className={cn(
            "flex items-center gap-2 p-2 rounded mb-1",
            isMe ? "bg-emerald-600" : "bg-gray-100"
          )}>
            <User className={cn("w-8 h-8", isMe ? "text-white" : "text-gray-600")} />
            <div>
              <p className={cn(
                "text-sm font-medium",
                isMe ? "text-white" : "text-gray-900"
              )}>
                Contacto
              </p>
            </div>
          </div>
        )

      default:
        return (
          <div className={cn(
            "text-xs mb-1 px-2 py-0.5 rounded inline-block",
            isMe ? "bg-emerald-600" : "bg-gray-100"
          )}>
            📎 {message.media_type}
          </div>
        )
    }
  }

  return (
    <div className={cn(
      "flex mb-2 min-w-0 overflow-hidden",
      isMe ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[70%] rounded-lg px-3 py-2 shadow-sm",
        isMe
          ? "bg-emerald-500 text-white rounded-br-none"
          : "bg-white text-gray-900 rounded-bl-none"
      )}>
        {renderMedia()}
        {message.content && (
          <p className="whitespace-pre-wrap break-words text-sm">
            {formatMessage(message.content)}
          </p>
        )}
        <div className={cn(
          "flex items-center justify-end gap-1 mt-1",
          isMe ? "text-emerald-100" : "text-gray-400"
        )}>
          <span className="text-[10px]">{time}</span>
          {isMe && (
            <CheckCheck className="w-3.5 h-3.5" />
          )}
        </div>
      </div>
    </div>
  )
}
