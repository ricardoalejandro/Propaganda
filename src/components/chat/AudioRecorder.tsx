"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Square } from "lucide-react"
import { cn } from "@/lib/utils"

interface AudioRecorderProps {
    onRecordingComplete: (audioBlob: Blob) => void
    disabled?: boolean
}

export function AudioRecorder({ onRecordingComplete, disabled }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

            // Use opus for better WhatsApp compatibility
            const mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
                ? 'audio/ogg;codecs=opus'
                : 'audio/webm;codecs=opus'

            const mediaRecorder = new MediaRecorder(stream, { mimeType })
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType })
                onRecordingComplete(blob)

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop())

                // Reset timer
                if (timerRef.current) {
                    clearInterval(timerRef.current)
                }
                setRecordingTime(0)
            }

            mediaRecorder.start(100) // Collect data every 100ms
            setIsRecording(true)

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1)
            }, 1000)

        } catch (err) {
            console.error("Error accessing microphone:", err)
            alert("No se pudo acceder al micrófono. Por favor, permite el acceso.")
        }
    }, [onRecordingComplete])

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }, [])

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current) {
            // Set empty handler to prevent sending
            mediaRecorderRef.current.onstop = () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current)
                }
                setRecordingTime(0)
            }

            if (mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop()
            }

            // Stop all tracks
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
            setIsRecording(false)
        }
    }, [])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    if (isRecording) {
        return (
            <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-600 text-sm font-medium">{formatTime(recordingTime)}</span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={cancelRecording}
                    className="text-gray-500 hover:text-gray-700 h-8 w-8"
                >
                    <MicOff className="w-4 h-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={stopRecording}
                    className="text-red-500 hover:text-red-700 h-8 w-8"
                >
                    <Square className="w-4 h-4 fill-current" />
                </Button>
            </div>
        )
    }

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={startRecording}
            disabled={disabled}
            className={cn(
                "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <Mic className="w-5 h-5" />
        </Button>
    )
}
