'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SummaryCards } from '@/components/SummaryCards'
import { CampaignTable } from '@/components/CampaignTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Import, Campaign } from '@/types'
import { formatDate } from '@/lib/utils'
import { CalendarDays, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [latestImport, setLatestImport] = useState<Import | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: importData, error: importError } = await supabase
        .from('imports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (importError || !importData) {
        setLatestImport(null)
        setCampaigns([])
        setLoading(false)
        return
      }

      setLatestImport(importData)

      // Debug: mostrar valores
      console.log('Import Data:', {
        gam_revenue: importData?.gam_revenue,
        gam_faturamento_total: importData?.gam_faturamento_total,
        total_ganho: importData?.total_ganho,
        faturamento_tiktok: importData?.faturamento_tiktok,
        tiktok_spend: importData?.tiktok_spend,
        total_gasto: importData?.total_gasto,
      })

      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('import_id', importData.id)

      if (!campaignsError && campaignsData) {
        // Filtrar campanhas SEM DADOS
        const campanhasValidas = campaignsData.filter(c => c.status !== 'SEM DADOS')
        setCampaigns(campanhasValidas)
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!latestImport) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-lg">Nenhuma importação encontrada</p>
          <a href="/importar" className="text-blue-600 hover:underline">
            Fazer primeira importação →
          </a>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>Dados de {formatDate(latestImport.created_at)}</span>
          </div>
        </div>
      </div>

      {(() => {
        // Valores do banco
        const gastoTotal = Number(latestImport.tiktok_spend ?? latestImport.total_gasto ?? 0)
        const ganhoRastreado = Number(latestImport.gam_revenue ?? latestImport.total_ganho ?? 0)  // Soma das campanhas GUP-01
        const faturamentoTikTok = Number(latestImport.gam_faturamento_total ?? latestImport.faturamento_tiktok ?? 0)  // Total utm_source

        // Cálculos RASTREADOS (baseado nas campanhas que conseguimos rastrear)
        const lucroRastreado = ganhoRastreado - gastoTotal
        const roiRastreado = gastoTotal > 0 ? ((ganhoRastreado - gastoTotal) / gastoTotal) * 100 : 0

        // Cálculos REAIS (baseado no faturamento total)
        const lucroReal = faturamentoTikTok - gastoTotal
        const roiReal = gastoTotal > 0 ? ((faturamentoTikTok - gastoTotal) / gastoTotal) * 100 : 0

        // Debug
        console.log('Cálculos Dashboard:', {
          gastoTotal,
          ganhoRastreado,
          faturamentoTikTok,
          lucroRastreado,
          roiRastreado,
          lucroReal,
          roiReal,
        })

        return (
          <SummaryCards
            totalGasto={gastoTotal}
            totalGanho={ganhoRastreado}
            totalLucro={lucroRastreado}
            roiGeral={roiRastreado}
            faturamentoTiktok={faturamentoTikTok}
            lucroReal={lucroReal}
            roiReal={roiReal}
          />
        )
      })()}

      <Card>
        <CardHeader>
          <CardTitle>Campanhas ({campaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignTable campaigns={campaigns} />
        </CardContent>
      </Card>
    </div>
  )
}
