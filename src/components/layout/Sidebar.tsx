'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  Users,
  Smartphone,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const navItems = [
  {
    name: 'Inbox',
    href: '/inbox',
    icon: MessageSquare,
    description: 'Bandeja de mensajes',
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: Users,
    description: 'Embudo de ventas',
  },
  {
    name: 'Conexiones',
    href: '/connections',
    icon: Smartphone,
    description: 'Cuentas WhatsApp',
  },
  {
    name: 'Reportes',
    href: '/reports',
    icon: BarChart3,
    description: 'Estadísticas',
  },
  {
    name: 'Logs',
    href: '/logs',
    icon: FileText,
    description: 'Logs del sistema',
  },
  {
    name: 'Configuración',
    href: '/settings',
    icon: Settings,
    description: 'Ajustes del sistema',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)


  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col h-screen bg-slate-900 text-white transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold whitespace-nowrap">
                Propaganda
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-green-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium whitespace-nowrap">
                    {item.name}
                  </span>
                )}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    <p>{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )
            }

            return <div key={item.href}>{linkContent}</div>
          })}
        </nav>

        {/* Collapse Button */}
        <div className="p-2 border-t border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'w-full text-slate-400 hover:text-white hover:bg-slate-800',
              collapsed ? 'justify-center' : 'justify-start'
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5 mr-2" />
                <span>Colapsar</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
