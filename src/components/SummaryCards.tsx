'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Target, Zap, PiggyBank } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface SummaryCardsProps {
  totalGasto: number
  totalGanho: number  // Ganho Rastreado (soma campanhas GUP-01)
  totalLucro?: number  // Lucro Rastreado (será calculado se não fornecido)
  roiGeral?: number    // ROI Rastreado (será calculado se não fornecido)
  faturamentoTiktok?: number  // Faturamento Total TikTok
  lucroReal?: number   // Lucro Real (será calculado se não fornecido)
  roiReal?: number     // ROI Real (será calculado se não fornecido)
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
  // Calcular valores RASTREADOS se não vierem prontos
  // Lucro Rastreado = Ganho Rastreado - Gasto Total
  const lucroRastreado = totalLucro ?? (totalGanho - totalGasto)
  // ROI Rastreado = (Lucro Rastreado / Gasto) * 100
  const roiRastreado = roiGeral ?? (totalGasto > 0 ? ((totalGanho - totalGasto) / totalGasto) * 100 : 0)

  // Calcular valores REAIS se não vierem prontos
  // Lucro Real = Faturamento TikTok - Gasto Total
  const lucroRealCalc = lucroReal ?? ((faturamentoTiktok ?? 0) - totalGasto)
  // ROI Real = (Lucro Real / Gasto) * 100
  const roiRealCalc = roiReal ?? (totalGasto > 0 ? (((faturamentoTiktok ?? 0) - totalGasto) / totalGasto) * 100 : 0)

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
            {lucroRastreado >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lucroRastreado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(lucroRastreado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ganho Rastreado - Gasto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI Rastreado</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${roiRastreado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(roiRastreado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Baseado no Ganho Rastreado
            </p>
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

          <Card className={lucroRealCalc >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${lucroRealCalc >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                Lucro Real
              </CardTitle>
              <PiggyBank className={`h-4 w-4 ${lucroRealCalc >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lucroRealCalc >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(lucroRealCalc)}
              </div>
              <p className={`text-xs mt-1 ${lucroRealCalc >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Faturamento - Gasto Total
              </p>
            </CardContent>
          </Card>

          <Card className={roiRealCalc >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${roiRealCalc >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                ROI Real
              </CardTitle>
              <Target className={`h-4 w-4 ${roiRealCalc >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${roiRealCalc >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatPercent(roiRealCalc)}
              </div>
              <p className={`text-xs mt-1 ${roiRealCalc >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                (Faturamento - Gasto) / Gasto
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
