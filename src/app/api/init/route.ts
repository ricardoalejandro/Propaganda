import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

const SUPER_ADMIN_USER = process.env.SUPER_ADMIN_USER || 'admin'
const SUPER_ADMIN_PASS = process.env.SUPER_ADMIN_PASS || 'difusion123'
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@propaganda.local'

// This endpoint is called once on app startup to seed the admin user
// It's idempotent - safe to call multiple times
export async function GET() {
    try {
        console.log('[Init] Starting admin seed...')
        console.log('[Init] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')
        console.log('[Init] SUPER_ADMIN_USER:', SUPER_ADMIN_USER)

        // Test database connection
        await prisma.$connect()
        console.log('[Init] Database connected')

        const existingAdmin = await prisma.user.findUnique({
            where: { username: SUPER_ADMIN_USER }
        })
        console.log('[Init] Existing admin:', existingAdmin ? 'found' : 'not found')

        const passwordHash = await hashPassword(SUPER_ADMIN_PASS)

        if (existingAdmin) {
            // Update password if it changed (from env var)
            await prisma.user.update({
                where: { id: existingAdmin.id },
                data: {
                    passwordHash,
                    email: SUPER_ADMIN_EMAIL,
                    isAdmin: true
                }
            })
            console.log('[Init] Admin updated')
            return NextResponse.json({ success: true, message: 'Admin updated' })
        } else {
            // Create new admin
            await prisma.user.create({
                data: {
                    username: SUPER_ADMIN_USER,
                    email: SUPER_ADMIN_EMAIL,
                    passwordHash,
                    displayName: 'Administrador',
                    isAdmin: true,
                    accountId: null // Admin doesn't belong to any account
                }
            })
            console.log('[Init] Admin created')
            return NextResponse.json({ success: true, message: 'Admin created' })
        }
    } catch (error) {
        console.error('[Init] Error seeding admin:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json(
            { success: false, error: message, details: String(error) },
            { status: 500 }
        )
    }
}
