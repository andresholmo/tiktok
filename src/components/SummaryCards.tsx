'use client'

import { Card, CardContent } from '@/components/ui/card'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap,
  Wallet,
  PiggyBank
} from 'lucide-react'
import { formatCurrencyBRL, formatPercentSafe } from '@/lib/utils'

interface SummaryCardsProps {
  // Linha 1 - Real
  faturamentoTiktok: number
  lucroReal: number
  roiReal: number
  
  // Linha 2 - Rastreado
  totalGasto: number
  totalGanho: number
  totalLucro: number
  roiGeral: number
  
  // Linha 3 - Orçamento (novo)
  orcamentoDiario?: number
  orcamentoRemanescente?: number
}

export function SummaryCards({
  faturamentoTiktok,
  lucroReal,
  roiReal,
  totalGasto,
  totalGanho,
  totalLucro,
  roiGeral,
  orcamentoDiario = 0,
  orcamentoRemanescente = 0,
}: SummaryCardsProps) {

  return (
    <div className="space-y-4">
      {/* LINHA 1 - Real (3 colunas no desktop, 1 no mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Faturamento TikTok */}
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-blue-600">Faturamento TikTok</span>
              <Zap className="h-4 w-4 text-blue-500 flex-shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-700 mt-1">
              {formatCurrencyBRL(faturamentoTiktok)}
            </div>
            <p className="text-xs text-blue-500 mt-1 hidden sm:block">Total no GAM (inclui não rastreado)</p>
          </CardContent>
        </Card>

        {/* Lucro Real */}
        <Card className={lucroReal >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className={`text-xs sm:text-sm ${lucroReal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Lucro Real
              </span>
              <TrendingUp className={`h-4 w-4 flex-shrink-0 ${lucroReal >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
            <div className={`text-xl sm:text-2xl font-bold mt-1 ${lucroReal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrencyBRL(lucroReal)}
            </div>
            <p className={`text-xs mt-1 hidden sm:block ${lucroReal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              Faturamento - Gasto Total
            </p>
          </CardContent>
        </Card>

        {/* ROI Real */}
        <Card className={roiReal >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className={`text-xs sm:text-sm ${roiReal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ROI Real
              </span>
              <Target className={`h-4 w-4 flex-shrink-0 ${roiReal >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
            <div className={`text-xl sm:text-2xl font-bold mt-1 ${roiReal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatPercentSafe(roiReal)}
            </div>
            <p className={`text-xs mt-1 hidden sm:block ${roiReal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              (Faturamento - Gasto) / Gasto
            </p>
          </CardContent>
        </Card>
      </div>

      {/* LINHA 2 - Rastreado (4 colunas no desktop, 2 no mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Gasto Total */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-muted-foreground">Gasto Total</span>
              <DollarSign className="h-4 w-4 text-red-500 flex-shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-red-600 mt-1">
              {formatCurrencyBRL(totalGasto)}
            </div>
          </CardContent>
        </Card>

        {/* Ganho Rastreado */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-muted-foreground">Ganho Rastreado</span>
              <DollarSign className="h-4 w-4 text-green-500 flex-shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-green-600 mt-1">
              {formatCurrencyBRL(totalGanho)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Soma das campanhas com UTM</p>
          </CardContent>
        </Card>

        {/* Lucro Rastreado */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-muted-foreground">Lucro Rastreado</span>
              {totalLucro >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 flex-shrink-0" />
              )}
            </div>
            <div className={`text-lg sm:text-2xl font-bold mt-1 ${totalLucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrencyBRL(totalLucro)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Ganho - Gasto</p>
          </CardContent>
        </Card>

        {/* ROI Rastreado */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-muted-foreground">ROI Rastreado</span>
              <Target className={`h-4 w-4 flex-shrink-0 ${roiGeral >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
            <div className={`text-lg sm:text-2xl font-bold mt-1 ${roiGeral >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentSafe(roiGeral)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Baseado no Ganho Rastreado</p>
          </CardContent>
        </Card>
      </div>

      {/* LINHA 3 - Orçamento (2 colunas no desktop, 1 no mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Orçamento Diário */}
        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-purple-600">Orçamento Diário</span>
              <Wallet className="h-4 w-4 text-purple-500 flex-shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-purple-700 mt-1">
              {formatCurrencyBRL(orcamentoDiario)}
            </div>
            <p className="text-xs text-purple-500 mt-1 hidden sm:block">Soma dos orçamentos das campanhas</p>
          </CardContent>
        </Card>

        {/* Orçamento Restante */}
        <Card className={orcamentoRemanescente >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-orange-50 border-orange-100"}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className={`text-xs sm:text-sm ${orcamentoRemanescente >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                Orçamento Restante
              </span>
              <PiggyBank className={`h-4 w-4 flex-shrink-0 ${orcamentoRemanescente >= 0 ? 'text-emerald-500' : 'text-orange-500'}`} />
            </div>
            <div className={`text-xl sm:text-2xl font-bold mt-1 ${orcamentoRemanescente >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
              {formatCurrencyBRL(orcamentoRemanescente)}
            </div>
            <p className={`text-xs mt-1 hidden sm:block ${orcamentoRemanescente >= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
              Orçamento Diário - Gasto Total
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
