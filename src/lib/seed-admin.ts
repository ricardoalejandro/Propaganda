import { prisma } from './db'
import { hashPassword } from './auth'

const SUPER_ADMIN_USER = process.env.SUPER_ADMIN_USER || 'admin'
const SUPER_ADMIN_PASS = process.env.SUPER_ADMIN_PASS || 'difusion123'
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@propaganda.local'

export async function seedSuperAdmin(): Promise<void> {
    try {
        // Ensure default account exists
        let defaultAccount = await prisma.account.findFirst({
            where: { name: 'Default Account' }
        })

        if (!defaultAccount) {
            defaultAccount = await prisma.account.create({
                data: {
                    name: 'Default Account'
                }
            })
            console.log('[Admin Seed] Default account created')
        }

        const existingAdmin = await prisma.user.findUnique({
            where: { username: SUPER_ADMIN_USER }
        })

        const passwordHash = await hashPassword(SUPER_ADMIN_PASS)

        if (existingAdmin) {
            // Update password and ensure account association
            await prisma.user.update({
                where: { id: existingAdmin.id },
                data: {
                    passwordHash,
                    email: SUPER_ADMIN_EMAIL,
                    isAdmin: true,
                    accountId: existingAdmin.accountId || defaultAccount.id
                }
            })
            console.log('[Admin Seed] Super admin updated from environment variables')
        } else {
            // Create new admin with default account
            await prisma.user.create({
                data: {
                    username: SUPER_ADMIN_USER,
                    email: SUPER_ADMIN_EMAIL,
                    passwordHash,
                    displayName: 'Administrador',
                    isAdmin: true,
                    accountId: defaultAccount.id
                }
            })
            console.log('[Admin Seed] Super admin created')
        }
    } catch (error) {
        console.error('[Admin Seed] Error seeding super admin:', error)
    }
}
