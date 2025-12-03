'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, TrendingUp, TrendingDown, Target } from 'lucide-react'
import { getTodayBR } from '@/lib/date-utils'
import { formatCurrencyBRL, formatPercentSafe } from '@/lib/utils'

interface ImportResult {
  success: boolean
  summary?: {
    totalCampaigns: number
    tiktokSpend: number
    gamRevenue: number
    profit: number
    roi: number
  }
  error?: string
}

export function ImportConsolidated() {
  const [startDate, setStartDate] = useState(() => getTodayBR())
  const [endDate, setEndDate] = useState(() => getTodayBR())
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)


  const handleFetchAll = async () => {
    setLoading(true)
    setResult(null)

    try {
      // 1. Buscar TikTok
      setProgress('Buscando dados do TikTok...')
      const tiktokResponse = await fetch('/api/tiktok/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      const tiktokResult = await tiktokResponse.json()
      
      if (!tiktokResult.success && !tiktokResult.campaigns) {
        throw new Error(tiktokResult.error || 'Erro ao buscar TikTok')
      }

      const tiktokCampaigns = tiktokResult.campaigns || []
      const totalTiktokSpend = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.gasto || 0), 0)
      const totalTiktokImpressions = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.impressoes || 0), 0)
      const totalTiktokClicks = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.cliques || 0), 0)

      // 2. Buscar GAM Campanhas
      setProgress('Buscando campanhas do GAM...')
      const gamCampaignsResponse = await fetch('/api/gam/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      const gamCampaignsResult = await gamCampaignsResponse.json()

      if (!gamCampaignsResult.success) {
        throw new Error(gamCampaignsResult.error || 'Erro ao buscar GAM')
      }

      // 3. Buscar GAM Faturamento Total
      setProgress('Buscando faturamento total...')
      const gamFaturamentoResponse = await fetch('/api/gam/faturamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      const gamFaturamentoResult = await gamFaturamentoResponse.json()

      const combinedGam = {
        ...gamCampaignsResult,
        faturamentoTotal: gamFaturamentoResult.success ? gamFaturamentoResult.faturamentoTikTok : 0,
      }

      // 4. Salvar no banco
      setProgress('Salvando dados e calculando ROI...')
      
      const saveResponse = await fetch('/api/import/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          tiktok: {
            campaigns: tiktokCampaigns.map((c: any) => ({
              campaign_id: c.campaign_id || '',
              campanha: c.campanha,
              gasto: c.gasto || 0,
              impressoes: c.impressoes || 0,
              cliques: c.cliques || 0,
              ctr: c.ctr || 0,
              cpc: c.cpc || 0,
              status: c.status,
              orcamento_diario: c.orcamento_diario || 0,
            })),
            totalSpend: totalTiktokSpend,
            totalImpressions: totalTiktokImpressions,
            totalClicks: totalTiktokClicks,
          },
          gam: {
            campaigns: combinedGam.campaigns || [],
            totalRevenue: combinedGam.totalReceita || 0,
            faturamentoTotal: combinedGam.faturamentoTotal || 0,
            totalImpressions: combinedGam.totalImpressoes || 0,
            totalClicks: combinedGam.totalCliques || 0,
          },
        }),
      })

      const saveResult = await saveResponse.json()

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Erro ao salvar')
      }

      setResult(saveResult)

    } catch (error: any) {
      setResult({ success: false, error: error.message })
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Importação Consolidada + ROI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Data Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Data Fim</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <Button onClick={handleFetchAll} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {progress || 'Processando...'}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Importar TikTok + GAM e Calcular ROI
            </>
          )}
        </Button>

        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            {result.success && result.summary ? (
              <div className="space-y-4">
                {/* Cards de resumo */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Gasto TikTok */}
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-xs text-muted-foreground">Gasto TikTok</div>
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrencyBRL(result.summary?.tiktokSpend)}
                    </div>
                  </div>

                  {/* Receita GAM */}
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-xs text-muted-foreground">Receita GAM</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrencyBRL(result.summary?.gamRevenue)}
                    </div>
                  </div>

                  {/* Lucro/Prejuízo */}
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {(result.summary?.profit ?? 0) >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      {(result.summary?.profit ?? 0) >= 0 ? 'Lucro' : 'Prejuízo'}
                    </div>
                    <div className={`text-lg font-bold ${(result.summary?.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrencyBRL(Math.abs(result.summary?.profit ?? 0))}
                    </div>
                  </div>

                  {/* ROI */}
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-xs text-muted-foreground">ROI</div>
                    <div className={`text-lg font-bold ${(result.summary?.roi ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentSafe(result.summary?.roi)}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-green-700 text-center">
                  ✓ {result.summary?.totalCampaigns ?? 0} campanhas importadas com sucesso
                </div>
              </div>
            ) : (
              <div className="text-red-700">
                ✗ {result.error}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

