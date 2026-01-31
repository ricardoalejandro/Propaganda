import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production'
const TOKEN_EXPIRY = '7d'

export interface JWTPayload {
    userId: string
    username: string
    isAdmin: boolean
    accountId: string | null
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
}

// JWT Token management
export function createToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload
    } catch {
        return null
    }
}

// Session management
export async function getSession(): Promise<JWTPayload | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) return null

    return verifyToken(token)
}

export async function setSession(payload: JWTPayload): Promise<void> {
    const token = createToken(payload)
    const cookieStore = await cookies()

    cookieStore.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    })
}

export async function clearSession(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete('auth-token')
}

// User authentication
export async function authenticateUser(username: string, password: string) {
    const user = await prisma.user.findUnique({
        where: { username },
        include: { account: true }
    })

    if (!user) {
        return { success: false, error: 'Usuario no encontrado' }
    }

    const isValid = await verifyPassword(password, user.passwordHash)

    if (!isValid) {
        return { success: false, error: 'Contraseña incorrecta' }
    }

    const payload: JWTPayload = {
        userId: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        accountId: user.accountId
    }

    await setSession(payload)

    return {
        success: true,
        user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            isAdmin: user.isAdmin,
            accountId: user.accountId,
            accountName: user.account?.name || null
        }
    }
}

// Check if user is admin
export async function requireAdmin(): Promise<JWTPayload> {
    const session = await getSession()

    if (!session) {
        throw new Error('No autenticado')
    }

    if (!session.isAdmin) {
        throw new Error('Acceso denegado: se requiere administrador')
    }

    return session
}

// Check if user is authenticated
export async function requireAuth(): Promise<JWTPayload> {
    const session = await getSession()

    if (!session) {
        throw new Error('No autenticado')
    }

    return session
}
