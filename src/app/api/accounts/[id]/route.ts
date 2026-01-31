import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// DELETE /api/accounts/[id] - Delete an account (admin only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin()

        const { id } = await params

        // Delete the account (cascade deletes users, connections, etc.)
        await prisma.account.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Accounts DELETE] Error:', error)
        const message = error instanceof Error ? error.message : 'Error interno'
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
}

// GET /api/accounts/[id] - Get account details (admin only)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin()

        const { id } = await params

        const account = await prisma.account.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        email: true,
                        createdAt: true
                    }
                },
                connections: true,
                _count: {
                    select: { leads: true }
                }
            }
        })

        if (!account) {
            return NextResponse.json(
                { success: false, error: 'Cuenta no encontrada' },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, account })
    } catch (error) {
        console.error('[Accounts GET] Error:', error)
        const message = error instanceof Error ? error.message : 'Error interno'
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
}
