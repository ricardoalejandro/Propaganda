import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export interface JWTPayload {
    userId: string
    username: string
    isAdmin: boolean
    accountId: string | null
}

// Routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/login', '/api/auth/session', '/api/auth/logout', '/api/init', '/api/media', '/api/webhook']

// Routes that require admin access
const adminRoutes = ['/admin', '/api/accounts']

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production'

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Allow public routes
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next()
    }

    // Allow static files and Next.js internals
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next()
    }

    // Get auth token from cookies
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
        // Redirect to login for page requests
        if (!pathname.startsWith('/api/')) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        // Return 401 for API requests
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verify token using jose (Edge-compatible)
    let payload: JWTPayload | null = null
    try {
        const secret = new TextEncoder().encode(JWT_SECRET)
        const { payload: jwtPayload } = await jwtVerify(token, secret)
        payload = {
            userId: jwtPayload.userId as string,
            username: jwtPayload.username as string,
            isAdmin: jwtPayload.isAdmin as boolean,
            accountId: jwtPayload.accountId as string | null
        }
    } catch (error) {
        console.error('[Middleware] JWT verification failed:', error)
        // Invalid token - redirect to login
        if (!pathname.startsWith('/api/')) {
            const response = NextResponse.redirect(new URL('/login', request.url))
            response.cookies.delete('auth-token')
            return response
        }
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Check admin routes
    if (adminRoutes.some(route => pathname.startsWith(route))) {
        if (!payload.isAdmin) {
            if (!pathname.startsWith('/api/')) {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
        }
    }

    // Add user info to request headers for downstream use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-user-name', payload.username)
    requestHeaders.set('x-is-admin', payload.isAdmin ? 'true' : 'false')
    requestHeaders.set('x-account-id', payload.accountId || '')

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
