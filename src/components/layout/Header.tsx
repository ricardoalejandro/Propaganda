'use client'

import { Bell, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface HeaderProps {
  title?: string
  subtitle?: string
  showSearch?: boolean
  onSearch?: (query: string) => void
  actions?: React.ReactNode
}

export function Header({
  title,
  subtitle,
  showSearch = false,
  onSearch,
  actions,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b">
      {/* Title Section */}
      <div className="flex items-center gap-4">
        {title && (
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
        )}
      </div>

      {/* Center - Search */}
      {showSearch && (
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Buscar leads, conversaciones..."
              className="pl-10 bg-slate-50 border-slate-200"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Custom Actions */}
        {actions}

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-slate-600" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-red-500">
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <p className="font-medium text-sm">Nuevo lead asignado</p>
              <p className="text-xs text-slate-500">
                Juan Pérez se ha unido al embudo de ventas
              </p>
              <span className="text-xs text-slate-400">Hace 5 minutos</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <p className="font-medium text-sm">Cuenta reconectada</p>
              <p className="text-xs text-slate-500">
                WhatsApp +51 999 888 777 está activo
              </p>
              <span className="text-xs text-slate-400">Hace 1 hora</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-green-600">
              Ver todas las notificaciones
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-green-100 text-green-700">
                  AD
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm font-medium text-slate-700">
                Admin
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
