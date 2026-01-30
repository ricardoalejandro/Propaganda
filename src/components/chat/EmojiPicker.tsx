"use client"

import { useState, useRef, useEffect } from "react"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"
import { Button } from "@/components/ui/button"
import { Smile } from "lucide-react"

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
    const [showPicker, setShowPicker] = useState(false)
    const pickerRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setShowPicker(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleEmojiSelect = (emoji: { native: string }) => {
        onEmojiSelect(emoji.native)
        setShowPicker(false)
    }

    return (
        <div className="relative">
            <Button
                ref={buttonRef}
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPicker(!showPicker)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
                <Smile className="w-5 h-5" />
            </Button>

            {showPicker && (
                <div
                    ref={pickerRef}
                    className="absolute bottom-12 left-0 z-50"
                >
                    <Picker
                        data={data}
                        onEmojiSelect={handleEmojiSelect}
                        theme="light"
                        locale="es"
                        previewPosition="none"
                        skinTonePosition="none"
                        maxFrequentRows={2}
                        perLine={8}
                    />
                </div>
            )}
        </div>
    )
}
