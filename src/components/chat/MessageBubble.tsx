"use client"

import { Message } from "@/lib/difusion"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CheckCheck } from "lucide-react"

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isMe = message.is_from_me
  const time = format(new Date(message.timestamp), "HH:mm")

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
        {message.media_type && message.media_type !== "" && (
          <div className={cn(
            "text-xs mb-1 px-2 py-0.5 rounded",
            isMe ? "bg-emerald-600" : "bg-gray-100"
          )}>
            📎 {message.media_type}
          </div>
        )}
        <p className="whitespace-pre-wrap break-words text-sm">
          {message.content || "[Media]"}
        </p>
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
