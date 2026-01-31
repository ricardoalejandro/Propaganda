import { prisma } from '@/lib/prisma'
import { difusionServer, Message as DifusionMessage, MessagesResponse, DifusionResponse } from '@/lib/difusion'
import { downloadMedia } from './media-download'

/**
 * Sync messages from difusion API to PostgreSQL
 * Downloads and caches media files locally
 */
export async function syncMessages(
    jid: string,
    connectionId: string,
    limit: number = 50
): Promise<{ synced: number; errors: number }> {
    let synced = 0
    let errors = 0

    try {
        // Fetch messages from difusion
        const response = await difusionServer.get<DifusionResponse<MessagesResponse>>(
            `/chat/${jid}/messages?limit=${limit}`
        )

        if (!response.data.results?.data) {
            return { synced: 0, errors: 0 }
        }

        const messages = response.data.results.data

        // Get or create chat
        let chat = await prisma.chat.findFirst({
            where: { jid, connectionId }
        })

        if (!chat) {
            chat = await prisma.chat.create({
                data: {
                    jid,
                    name: response.data.results.chat_info?.name || jid,
                    connectionId,
                    lastMsgTime: messages[0]?.timestamp ? new Date(messages[0].timestamp) : null
                }
            })
        }

        // Auto-create Lead for CRM
        try {
            const connection = await prisma.connection.findUnique({
                where: { id: connectionId }
            })

            if (connection?.accountId) {
                const existingLead = await prisma.lead.findUnique({
                    where: {
                        accountId_jid: {
                            accountId: connection.accountId,
                            jid
                        }
                    }
                })

                if (!existingLead) {
                    await prisma.lead.create({
                        data: {
                            accountId: connection.accountId,
                            jid,
                            name: response.data.results.chat_info?.name || jid,
                            phone: jid.split('@')[0],
                            stage: 'new'
                        }
                    })
                    console.log(`[Sync] Auto-created lead for ${jid}`)
                }
            }
        } catch (leadError) {
            console.error('[Sync] Error creating lead:', leadError)
        }

        // Sync each message
        for (const msg of messages) {
            try {
                // Check if message already exists
                const existing = await prisma.message.findFirst({
                    where: { externalId: msg.id, chatId: chat.id }
                })

                if (existing) {
                    // Skip if already synced and has media
                    if (!msg.url || existing.localUrl) {
                        continue
                    }
                }

                // Download media if present
                let localUrl: string | null = null
                if (msg.url && msg.media_type) {
                    try {
                        localUrl = await downloadMedia(msg.url, msg.id, msg.media_type, jid)
                    } catch (mediaErr) {
                        console.error(`[Sync] Failed to download media for ${msg.id}:`, mediaErr)
                    }
                }

                // Upsert message
                await prisma.message.upsert({
                    where: {
                        externalId_chatId: {
                            externalId: msg.id,
                            chatId: chat.id
                        }
                    },
                    update: {
                        localUrl: localUrl || undefined
                    },
                    create: {
                        externalId: msg.id,
                        chatId: chat.id,
                        senderJid: msg.sender_jid,
                        content: msg.content,
                        timestamp: new Date(msg.timestamp),
                        isFromMe: msg.is_from_me,
                        mediaType: msg.media_type || null,
                        filename: msg.filename || null,
                        url: msg.url || null,
                        localUrl,
                        fileLength: msg.file_length || null
                    }
                })

                synced++
            } catch (msgErr) {
                console.error(`[Sync] Error syncing message ${msg.id}:`, msgErr)
                errors++
            }
        }

        // Update chat's last message time
        if (messages.length > 0) {
            await prisma.chat.update({
                where: { id: chat.id },
                data: {
                    lastMessage: messages[0].content,
                    lastMsgTime: new Date(messages[0].timestamp)
                }
            })
        }

    } catch (err) {
        console.error('[Sync] Error syncing messages:', err)
        errors++
    }

    return { synced, errors }
}

/**
 * Get messages - first from PostgreSQL cache, then sync new ones
 */
export async function getMessagesWithCache(
    jid: string,
    connectionId: string,
    limit: number = 50
): Promise<DifusionMessage[]> {
    // Get cached messages from PostgreSQL
    const chat = await prisma.chat.findFirst({
        where: { jid, connectionId },
        include: {
            messages: {
                orderBy: { timestamp: 'desc' },
                take: limit
            }
        }
    })

    // If no chat or no messages, sync synchronously first
    if (!chat || chat.messages.length === 0) {
        console.log('[Sync] First load for chat, syncing synchronously...')
        await syncMessages(jid, connectionId, limit)

        // Fetch again after sync
        const freshChat = await prisma.chat.findFirst({
            where: { jid, connectionId },
            include: {
                messages: {
                    orderBy: { timestamp: 'desc' },
                    take: limit
                }
            }
        })

        return (freshChat?.messages || []).map((m: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
            id: m.externalId,
            chat_jid: jid,
            sender_jid: m.senderJid,
            content: m.content || '',
            timestamp: m.timestamp.toISOString(),
            is_from_me: m.isFromMe,
            media_type: m.mediaType || '',
            filename: m.filename || '',
            url: m.localUrl || m.url || '',
            file_length: m.fileLength || 0,
            created_at: m.createdAt.toISOString(),
            updated_at: m.createdAt.toISOString()
        }))
    }

    // Convert to difusion format
    const cachedMessages: DifusionMessage[] = (chat?.messages || []).map((m: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: m.externalId,
        chat_jid: jid,
        sender_jid: m.senderJid,
        content: m.content || '',
        timestamp: m.timestamp.toISOString(),
        is_from_me: m.isFromMe,
        media_type: m.mediaType || '',
        filename: m.filename || '',
        url: m.localUrl || m.url || '', // Prefer local URL
        file_length: m.fileLength || 0,
        created_at: m.createdAt.toISOString(),
        updated_at: m.createdAt.toISOString()
    }))

    // Trigger background sync for updates
    syncMessages(jid, connectionId, limit).catch(err => {
        console.error('[Sync] Background sync error:', err)
    })

    return cachedMessages
}

/**
 * Helper to get or create a default connection
 * Useful for single-tenant setup or when we just need *a* connection
 */
export async function ensureDefaultConnection(): Promise<string> {
    // Try to find any logged in connection
    const connection = await prisma.connection.findFirst({
        where: { isLoggedIn: true }
    })

    if (connection) return connection.id

    // If no logged in connection, find ANY connection
    const anyConnection = await prisma.connection.findFirst()
    if (anyConnection) return anyConnection.id

    // If no connection at all, create a default one
    // First ensure we have an account
    let account = await prisma.account.findFirst()
    if (!account) {
        account = await prisma.account.create({
            data: {
                name: 'Default Account',
                slug: 'default'
            }
        })
    }

    // Create connection
    const newConnection = await prisma.connection.create({
        data: {
            name: 'WhatsApp Principal',
            accountId: account.id,
            isConnected: false
        }
    })

    return newConnection.id
}
