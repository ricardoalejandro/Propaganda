import { prisma } from './db'
import { hashPassword } from './auth'

const SUPER_ADMIN_USER = process.env.SUPER_ADMIN_USER || 'admin'
const SUPER_ADMIN_PASS = process.env.SUPER_ADMIN_PASS || 'difusion123'
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@propaganda.local'

export async function seedSuperAdmin(): Promise<void> {
    try {
        const existingAdmin = await prisma.user.findUnique({
            where: { username: SUPER_ADMIN_USER }
        })

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
            console.log('[Admin Seed] Super admin updated from environment variables')
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
            console.log('[Admin Seed] Super admin created')
        }
    } catch (error) {
        console.error('[Admin Seed] Error seeding super admin:', error)
    }
}
