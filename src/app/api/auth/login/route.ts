import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production'
const TOKEN_EXPIRY = '7d'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

interface JWTPayload {
    userId: string
    username: string
    isAdmin: boolean
    accountId: string | null
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { username, password } = body

        if (!username || !password) {
            return NextResponse.json(
                { success: false, error: 'Usuario y contraseña son requeridos' },
                { status: 400 }
            )
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { username },
            include: { account: true }
        })

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Usuario no encontrado' },
                { status: 401 }
            )
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash)

        if (!isValid) {
            return NextResponse.json(
                { success: false, error: 'Contraseña incorrecta' },
                { status: 401 }
            )
        }

        // Create JWT payload
        const payload: JWTPayload = {
            userId: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            accountId: user.accountId
        }

        // Create token
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })

        // Create response with cookie
        const response = NextResponse.json({
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
        })

        // Set cookie directly on response object
        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: IS_PRODUCTION,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        })

        console.log('[Auth Login] Success for user:', username, 'Cookie set:', IS_PRODUCTION ? 'secure' : 'insecure')

        return response
    } catch (error) {
        console.error('[Auth Login] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
