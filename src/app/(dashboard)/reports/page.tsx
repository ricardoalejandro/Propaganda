'use client'

import { BarChart3, TrendingUp, Users, MessageSquare, DollarSign, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ReportsPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between h-16 px-6 bg-white border-b">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Reportes</h1>
          <p className="text-sm text-slate-500">Estadísticas y métricas del CRM</p>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground">Total Leads</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600">+0%</span> vs mes anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground">Conversaciones</CardTitle>
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600">+0%</span> vs mes anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground">Tasa de Conversión</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-slate-500">Sin datos</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground">Valor Pipeline</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">S/ 0</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-slate-500">Sin datos</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon */}
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="w-16 h-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">Reportes Próximamente</h2>
            <p className="text-slate-500 text-center max-w-md">
              Estamos trabajando en gráficos detallados de conversión, rendimiento por etapa, 
              métricas de respuesta y más. ¡Muy pronto!
            </p>
          </CardContent>
        </Card>

        {/* Placeholder Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Leads por Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
                <p className="text-slate-400">Gráfico de barras próximamente</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Embudo de Ventas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
                <p className="text-slate-400">Gráfico de embudo próximamente</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
