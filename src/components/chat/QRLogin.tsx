"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Loader2, QrCode, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QRLoginProps {
  onLoginSuccess: () => void
}

export function QRLogin({ onLoginSuccess }: QRLoginProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const fetchingRef = useRef(false)

  const fetchQR = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true

    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/login", { cache: 'no-store' })
      const data = await response.json()
      
      if (data.code === "SUCCESS" && data.results) {
        // qr_link now contains base64 data URL directly
        setQrUrl(data.results.qr_link)
        setCountdown(data.results.qr_duration || 60)
      } else if (data.message?.includes("already logged")) {
        onLoginSuccess()
      } else {
        setError(data.message || "Error al obtener QR")
      }
    } catch (err) {
      console.error(err)
      setError("Error de conexión")
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [onLoginSuccess])

  // Check status periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/status")
        const data = await response.json()
        if (data.results?.is_logged_in) {
          onLoginSuccess()
        }
      } catch (err) {
        console.error(err)
      }
    }

    const interval = setInterval(checkStatus, 3000)
    return () => clearInterval(interval)
  }, [onLoginSuccess])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchQR() // Refresh QR when expired
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown, fetchQR])

  // Initial fetch
  useEffect(() => {
    fetchQR()
  }, [fetchQR])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Propaganda Chat</h1>
          <p className="text-gray-500 mt-2">Escanea el código QR con WhatsApp</p>
        </div>

        <div className="relative bg-gray-50 rounded-xl p-4 min-h-[280px] flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <span className="text-gray-500 text-sm">Generando código QR...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="text-red-500">{error}</span>
              <Button onClick={fetchQR} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            </div>
          ) : qrUrl ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={qrUrl} 
                alt="QR Code" 
                width={256}
                height={256}
                className="object-contain"
              />
              {countdown > 0 && (
                <span className="text-sm text-gray-500">
                  Expira en {countdown}s
                </span>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-6 text-center">
          <ol className="text-sm text-gray-600 space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="bg-emerald-100 text-emerald-700 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">1</span>
              <span>Abre WhatsApp en tu teléfono</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-emerald-100 text-emerald-700 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">2</span>
              <span>Ve a Configuración → Dispositivos vinculados</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-emerald-100 text-emerald-700 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">3</span>
              <span>Escanea este código QR</span>
            </li>
          </ol>
        </div>

        <Button 
          onClick={fetchQR} 
          variant="ghost" 
          className="w-full mt-4"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar QR
        </Button>
      </div>
    </div>
  )
}
