import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureDefaultConnection } from '@/lib/message-sync'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const connectionId = await ensureDefaultConnection()
        const connection = await prisma.connection.findUnique({
            where: { id: connectionId }
        })

        if (!connection) {
            return NextResponse.json({ message: 'No active connection found' }, { status: 404 })
        }

        const leads = await prisma.lead.findMany({
            where: {
                accountId: connection.accountId
            },
            orderBy: {
                updatedAt: 'desc'
            }
        })

        return NextResponse.json({ results: leads })
    } catch (error) {
        console.error('Error fetching leads:', error)
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
    }
}
