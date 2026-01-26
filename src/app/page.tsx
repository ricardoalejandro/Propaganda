"use client"

import { useState, useEffect, useCallback } from "react"
import { QRLogin } from "@/components/chat/QRLogin"
import { ChatApp } from "@/components/chat/ChatApp"
import { Loader2 } from "lucide-react"

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  const handleLoginSuccess = useCallback(() => {
    setIsLoggedIn(true)
  }, [])

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/status")
        const data = await response.json()
        setIsLoggedIn(data.results?.is_logged_in || false)
      } catch (err) {
        console.error("Error checking status:", err)
        setIsLoggedIn(false)
      }
    }

    checkStatus()
  }, [])

  // Loading state
  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600">
        <div className="text-white flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin" />
          <span>Conectando...</span>
        </div>
      </div>
    )
  }

  // Not logged in - show QR
  if (!isLoggedIn) {
    return <QRLogin onLoginSuccess={handleLoginSuccess} />
  }

  // Logged in - show chat
  return <ChatApp onLogout={() => setIsLoggedIn(false)} />
}
