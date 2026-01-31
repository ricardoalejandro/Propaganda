"use client"

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    MessageSquare,
    Users,
    Link2,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Building2
} from 'lucide-react'

interface User {
    id: string
    username: string
    displayName: string
    isAdmin: boolean
    accountName: string | null
}

const navItems = [
    { href: '/dashboard/chats', label: 'Chats', icon: MessageSquare },
    { href: '/dashboard/leads', label: 'Leads', icon: Users },
    { href: '/dashboard/connections', label: 'Conexiones', icon: Link2 },
    { href: '/dashboard/config', label: 'Configuración', icon: Settings },
]

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await fetch('/api/auth/session')
                const data = await res.json()
                if (data.authenticated) {
                    setUser(data.user)
                }
            } catch (err) {
                console.error('Error fetching session:', err)
            }
        }
        fetchSession()
    }, [])

    const handleLogout = async () => {
        setLoggingOut(true)
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            router.push('/login')
            router.refresh()
        } catch (err) {
            console.error('Error logging out:', err)
        } finally {
            setLoggingOut(false)
        }
    }

    return (
        <div className="h-screen flex bg-gray-100">
            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
                    sidebarOpen ? "w-64" : "w-20",
                    mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        {sidebarOpen && (
                            <span className="font-bold text-gray-800 text-lg">Propaganda</span>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="hidden lg:flex"
                    >
                        <ChevronRight className={cn(
                            "w-5 h-5 text-gray-500 transition-transform",
                            !sidebarOpen && "rotate-180"
                        )} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileMenuOpen(false)}
                        className="lg:hidden"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* User Info */}
                {user && sidebarOpen && (
                    <div className="px-4 py-3 border-b border-gray-200">
                        <p className="font-medium text-gray-800 truncate">{user.displayName}</p>
                        <p className="text-xs text-gray-500 truncate">
                            {user.isAdmin ? 'Administrador' : user.accountName || user.username}
                        </p>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                                    isActive
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "text-gray-600 hover:bg-gray-100"
                                )}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <item.icon className={cn(
                                    "w-5 h-5",
                                    isActive ? "text-emerald-600" : "text-gray-400"
                                )} />
                                {sidebarOpen && (
                                    <span className="font-medium">{item.label}</span>
                                )}
                            </Link>
                        )
                    })}

                    {/* Admin Panel Link */}
                    {user?.isAdmin && (
                        <>
                            <div className="h-px bg-gray-200 my-3" />
                            <Link
                                href="/admin"
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                                    pathname.startsWith('/admin')
                                        ? "bg-purple-50 text-purple-700"
                                        : "text-gray-600 hover:bg-gray-100"
                                )}
                            >
                                <Building2 className={cn(
                                    "w-5 h-5",
                                    pathname.startsWith('/admin') ? "text-purple-600" : "text-gray-400"
                                )} />
                                {sidebarOpen && (
                                    <span className="font-medium">Admin</span>
                                )}
                            </Link>
                        </>
                    )}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-gray-200">
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50",
                            !sidebarOpen && "justify-center"
                        )}
                        onClick={handleLogout}
                        disabled={loggingOut}
                    >
                        <LogOut className="w-5 h-5" />
                        {sidebarOpen && (
                            <span className="ml-3">{loggingOut ? 'Saliendo...' : 'Cerrar Sesión'}</span>
                        )}
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center px-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileMenuOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </Button>
                    <span className="ml-4 font-bold text-gray-800">Propaganda</span>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    )
}
