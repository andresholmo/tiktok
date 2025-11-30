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

      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('import_id', importData.id)

      if (!campaignsError && campaignsData) {
        setCampaigns(campaignsData)
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

      <SummaryCards
        totalGasto={Number(latestImport.total_gasto)}
        totalGanho={Number(latestImport.total_ganho)}
        totalLucro={Number(latestImport.total_lucro)}
        roiGeral={Number(latestImport.roi_geral)}
        faturamentoTiktok={Number(latestImport.faturamento_tiktok)}
        lucroReal={Number(latestImport.lucro_real)}
        roiReal={Number(latestImport.roi_real)}
      />

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
