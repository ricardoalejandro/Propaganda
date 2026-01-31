import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureDefaultConnection } from '@/lib/message-sync'

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jid: string }> }
) {
    try {
        const { jid } = await params
        const decodedJid = decodeURIComponent(jid) // Handle encoding if necessary

        // We need accountId. For now, using default connection's account
        const connectionId = await ensureDefaultConnection()
        const connection = await prisma.connection.findUnique({
            where: { id: connectionId }
        })

        if (!connection) {
            return NextResponse.json({ message: 'Connection not found' }, { status: 404 })
        }

        const lead = await prisma.lead.findUnique({
            where: {
                accountId_jid: {
                    accountId: connection.accountId,
                    jid: decodedJid
                }
            },
            include: {
                customValues: {
                    include: {
                        customField: true
                    }
                }
            }
        })

        if (!lead) {
            // Lazy create lead if it doesn't exist
            // 1. Get chat info to get the name
            const chat = await prisma.chat.findUnique({
                where: {
                    jid_connectionId: {
                        jid: decodedJid,
                        connectionId: connection.id
                    }
                }
            })

            const newLead = await prisma.lead.create({
                data: {
                    accountId: connection.accountId,
                    jid: decodedJid,
                    name: chat?.name || decodedJid,
                    phone: decodedJid.split('@')[0],
                    stage: 'new'
                }
            })

            return NextResponse.json(newLead)
        }

        return NextResponse.json(lead)

    } catch (error) {
        console.error('Error fetching lead:', error)
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ jid: string }> }
) {
    try {
        const { jid } = await params
        const decodedJid = decodeURIComponent(jid)
        const body = await request.json()

        const connectionId = await ensureDefaultConnection()
        const connection = await prisma.connection.findUnique({ where: { id: connectionId } })

        if (!connection) return NextResponse.json({ message: 'No connection' }, { status: 404 })

        const lead = await prisma.lead.update({
            where: {
                accountId_jid: {
                    accountId: connection.accountId,
                    jid: decodedJid
                }
            },
            data: {
                name: body.name,
                email: body.email,
                phone: body.phone,
                address: body.address,
                notes: body.notes,
                stage: body.stage
                // TODO: Custom fields update logic
            }
        })

        return NextResponse.json(lead)
    } catch (error) {
        console.error('Error updating lead:', error)
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
    }
}
