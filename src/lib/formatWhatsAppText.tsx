"use client"

import React from 'react'

/**
 * Formats WhatsApp-style text to React elements
 * Supports: *bold*, _italic_, ~strikethrough~, ```monospace```
 */
export function formatWhatsAppText(text: string): React.ReactNode {
    if (!text) return null

    // Split by formatting patterns while preserving the delimiters
    const patterns = [
        { regex: /\*([^*]+)\*/g, wrapper: (t: string, key: number) => <strong key={key} className="font-bold">{t}</strong> },
        { regex: /_([^_]+)_/g, wrapper: (t: string, key: number) => <em key={key} className="italic">{t}</em> },
        { regex: /~([^~]+)~/g, wrapper: (t: string, key: number) => <del key={key} className="line-through">{t}</del> },
        { regex: /```([^`]+)```/g, wrapper: (t: string, key: number) => <code key={key} className="font-mono bg-black/10 px-1 rounded text-sm">{t}</code> },
    ]

    let result: React.ReactNode[] = [text]
    let keyCounter = 0

    for (const { regex, wrapper } of patterns) {
        const newResult: React.ReactNode[] = []

        for (const segment of result) {
            if (typeof segment !== 'string') {
                newResult.push(segment)
                continue
            }

            let lastIndex = 0
            let match: RegExpExecArray | null

            // Reset regex state
            regex.lastIndex = 0

            while ((match = regex.exec(segment)) !== null) {
                // Add text before match
                if (match.index > lastIndex) {
                    newResult.push(segment.slice(lastIndex, match.index))
                }

                // Add formatted element
                newResult.push(wrapper(match[1], keyCounter++))
                lastIndex = match.index + match[0].length
            }

            // Add remaining text
            if (lastIndex < segment.length) {
                newResult.push(segment.slice(lastIndex))
            }
        }

        result = newResult
    }

    return result.length === 1 ? result[0] : result
}

/**
 * Converts URLs in text to clickable links
 */
export function linkifyText(text: string): React.ReactNode {
    if (!text) return null

    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)

    return parts.map((part, index) => {
        if (urlRegex.test(part)) {
            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline break-all"
                >
                    {part}
                </a>
            )
        }
        return part
    })
}

/**
 * Combines WhatsApp formatting with linkification
 */
export function formatMessage(text: string): React.ReactNode {
    // First linkify, then format
    const linked = linkifyText(text)

    if (Array.isArray(linked)) {
        return linked.map((node, index) => {
            if (typeof node === 'string') {
                return <React.Fragment key={index}>{formatWhatsAppText(node)}</React.Fragment>
            }
            return node
        })
    }

    if (typeof linked === 'string') {
        return formatWhatsAppText(linked)
    }

    return linked
}
