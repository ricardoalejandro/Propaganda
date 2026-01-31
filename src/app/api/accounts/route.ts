import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, hashPassword } from '@/lib/auth'

// GET /api/accounts - List all accounts (admin only)
export async function GET() {
    try {
        await requireAdmin()

        const accounts = await prisma.account.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        })

        return NextResponse.json({ success: true, accounts })
    } catch (error) {
        console.error('[Accounts GET] Error:', error)
        const message = error instanceof Error ? error.message : 'Error interno'
        return NextResponse.json(
            { success: false, error: message },
            { status: message.includes('autenticado') ? 401 : 403 }
        )
    }
}

// POST /api/accounts - Create new account with user (admin only)
export async function POST(request: NextRequest) {
    try {
        await requireAdmin()

        const body = await request.json()
        const { name, username, email, password, displayName } = body

        if (!name || !username || !email || !password || !displayName) {
            return NextResponse.json(
                { success: false, error: 'Todos los campos son requeridos' },
                { status: 400 }
            )
        }

        // Check if username or email already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }]
            }
        })

        if (existingUser) {
            return NextResponse.json(
                { success: false, error: 'El usuario o email ya existe' },
                { status: 400 }
            )
        }

        // Create slug from name
        const slug = name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')

        // Check if slug exists
        const existingAccount = await prisma.account.findUnique({
            where: { slug }
        })

        const finalSlug = existingAccount ? `${slug}-${Date.now()}` : slug

        // Hash password
        const passwordHash = await hashPassword(password)

        // Create account and user in transaction
        const account = await prisma.$transaction(async (tx) => {
            const newAccount = await tx.account.create({
                data: {
                    name,
                    slug: finalSlug
                }
            })

            await tx.user.create({
                data: {
                    username,
                    email,
                    displayName,
                    passwordHash,
                    isAdmin: false,
                    accountId: newAccount.id
                }
            })

            return newAccount
        })

        return NextResponse.json({ success: true, account })
    } catch (error) {
        console.error('[Accounts POST] Error:', error)
        const message = error instanceof Error ? error.message : 'Error interno'
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
}
