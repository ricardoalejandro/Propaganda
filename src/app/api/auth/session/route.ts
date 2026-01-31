import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json(
                { authenticated: false },
                { status: 401 }
            )
        }

        // Get full user data
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            include: { account: true }
        })

        if (!user) {
            return NextResponse.json(
                { authenticated: false },
                { status: 401 }
            )
        }

        return NextResponse.json({
            authenticated: true,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                email: user.email,
                isAdmin: user.isAdmin,
                accountId: user.accountId,
                accountName: user.account?.name || null
            }
        })
    } catch (error) {
        console.error('[Auth Session] Error:', error)
        return NextResponse.json(
            { authenticated: false, error: 'Error al verificar sesión' },
            { status: 500 }
        )
    }
}
