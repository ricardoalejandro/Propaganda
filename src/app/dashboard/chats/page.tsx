"use client"

import { useState, useEffect, useCallback } from "react"
import { ChatApp } from "@/components/chat/ChatApp"
import { Loader2 } from "lucide-react"

export default function ChatsPage() {
    const [isConnected, setIsConnected] = useState<boolean | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const checkStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/status')
            const data = await response.json()
            setIsConnected(data.results?.is_logged_in || false)
        } catch (err) {
            console.error("Error checking status:", err)
            setIsConnected(false)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        checkStatus()
        // Poll status periodically to detect connection changes
        const interval = setInterval(checkStatus, 15000)
        return () => clearInterval(interval)
    }, [checkStatus])

    // Show loading only on initial load
    if (isLoading && isConnected === null) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-emerald-600 flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <span>Cargando chats...</span>
                </div>
            </div>
        )
    }

    // Always show ChatApp - it handles connection status internally
    // Pass isConnected so ChatApp can disable sending when not connected
    return (
        <div className="h-full">
            <ChatApp
                onLogout={() => setIsConnected(false)}
                embedded
                isConnected={isConnected ?? false}
            />
        </div>
    )
}
