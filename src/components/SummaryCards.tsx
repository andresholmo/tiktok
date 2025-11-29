'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Target, Zap, PiggyBank } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface SummaryCardsProps {
  totalGasto: number
  totalGanho: number
  totalLucro: number
  roiGeral: number
  faturamentoTiktok?: number
  lucroReal?: number
  roiReal?: number
}

export function SummaryCards({ 
  totalGasto, 
  totalGanho, 
  totalLucro, 
  roiGeral,
  faturamentoTiktok,
  lucroReal,
  roiReal 
}: SummaryCardsProps) {
  return (
    <div className="space-y-4">
      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalGasto)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganho Rastreado</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalGanho)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma das campanhas com UTM
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Rastreado</CardTitle>
            {totalLucro >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalLucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalLucro)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI Rastreado</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${roiGeral >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(roiGeral)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de ROI Real */}
      {faturamentoTiktok !== undefined && faturamentoTiktok > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Faturamento TikTok</CardTitle>
              <Zap className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(faturamentoTiktok)}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Total no GAM (inclui não rastreado)
              </p>
            </CardContent>
          </Card>

          <Card className={lucroReal !== undefined && lucroReal >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${lucroReal !== undefined && lucroReal >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                Lucro Real
              </CardTitle>
              <PiggyBank className={`h-4 w-4 ${lucroReal !== undefined && lucroReal >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lucroReal !== undefined && lucroReal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(lucroReal || 0)}
              </div>
              <p className={`text-xs mt-1 ${lucroReal !== undefined && lucroReal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Faturamento - Gasto Total
              </p>
            </CardContent>
          </Card>

          <Card className={roiReal !== undefined && roiReal >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${roiReal !== undefined && roiReal >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                ROI Real
              </CardTitle>
              <Target className={`h-4 w-4 ${roiReal !== undefined && roiReal >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${roiReal !== undefined && roiReal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatPercent(roiReal || 0)}
              </div>
              <p className={`text-xs mt-1 ${roiReal !== undefined && roiReal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                (Faturamento - Gasto) / Gasto
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
