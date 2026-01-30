"use client"

import { Message } from "@/lib/difusion"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CheckCheck, FileText, Play, Mic, User } from "lucide-react"
import { formatMessage } from "@/lib/formatWhatsAppText"
import { useState } from "react"

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isMe = message.is_from_me
  const time = format(new Date(message.timestamp), "HH:mm")
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)

  // Render media content
  const renderMedia = () => {
    if (!message.media_type) return null

    switch (message.media_type) {
      case 'image':
        return (
          <>
            <div
              className="relative cursor-pointer mb-1 rounded overflow-hidden"
              onClick={() => setShowLightbox(true)}
            >
              {!imageLoaded && (
                <div className="w-48 h-32 bg-gray-200 animate-pulse rounded flex items-center justify-center">
                  <span className="text-gray-400 text-xs">Cargando...</span>
                </div>
              )}
              <img
                src={message.url}
                alt={message.filename || "Imagen"}
                className={cn(
                  "max-w-[250px] max-h-[300px] rounded object-cover",
                  !imageLoaded && "hidden"
                )}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            </div>
            {/* Lightbox */}
            {showLightbox && (
              <div
                className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                onClick={() => setShowLightbox(false)}
              >
                <img
                  src={message.url}
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
              src={message.url}
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
            <audio src={message.url} controls className="max-w-[220px]">
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
            href={message.url}
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
            src={message.url}
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
      "flex mb-2",
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
