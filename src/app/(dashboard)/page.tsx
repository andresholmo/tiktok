'use client'

import { useState, useEffect, useMemo } from 'react'
import { DateFilter } from '@/components/DateFilter'
import { SummaryCards } from '@/components/SummaryCards'
import { CampaignTable } from '@/components/CampaignTable'
import { CampaignFiltersNew } from '@/components/CampaignFiltersNew'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getTodayBR } from '@/lib/date-utils'
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Campaign } from '@/types'

interface Filters {
  search: string
  status: string
  criador: string
  nicho: string
  roi: string
}

// Extrair criador do nome da campanha
function extractCriador(campanha: string): string {
  const parts = campanha.split('-')
  if (parts.length >= 4) {
    const criadorPart = parts[3]
    const match = criadorPart?.match(/^([A-Z]+)/i)
    return match ? match[1].toUpperCase() : ''
  }
  return ''
}

// Extrair nicho do nome da campanha
function extractNicho(campanha: string): string {
  const parts = campanha.split('-')
  if (parts.length >= 6) {
    return parts[5].toUpperCase()
  }
  // Tentar encontrar nichos conhecidos no nome
  const possiveisNichos = ['YSQM', 'FHBH', 'FYA', 'OCT', 'EUMB', 'SAKC']
  for (const nicho of possiveisNichos) {
    if (campanha.includes(nicho)) return nicho
  }
  return ''
}

export default function DashboardPage() {
  const today = getTodayBR()
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Estado dos filtros
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'Todos',
    criador: 'Todos',
    nicho: 'Todos',
    roi: 'Todos',
  })

  // Buscar dados do período
  const fetchData = async (start: string, end: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/dashboard?startDate=${start}&endDate=${end}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar dados')
      }
      
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(startDate, endDate)
  }, [])

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    fetchData(start, end)
  }

  // Filtrar campanhas
  const filteredCampaigns = useMemo(() => {
    if (!data?.campaigns) return []
    
    // DEBUG: Verificar se is_smart_plus está chegando
    console.log('=== DEBUG: Campanhas filtradas (primeiras 3) ===')
    console.log(data.campaigns.slice(0, 3).map((c: Campaign) => ({ 
      nome: c.campanha, 
      is_smart_plus: c.is_smart_plus 
    })))
    
    return data.campaigns.filter((campaign: Campaign) => {
      // Filtro de busca (nome da campanha)
      if (filters.search && !campaign.campanha?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      
      // Filtro de status
      if (filters.status !== 'Todos' && campaign.status !== filters.status) {
        return false
      }
      
      // Filtro de criador
      if (filters.criador !== 'Todos') {
        const criador = extractCriador(campaign.campanha || '')
        if (criador !== filters.criador) return false
      }
      
      // Filtro de nicho
      if (filters.nicho !== 'Todos') {
        if (!campaign.campanha?.includes(filters.nicho)) return false
      }
      
      // Filtro de ROI
      if (filters.roi !== 'Todos') {
        const roi = campaign.roi ?? 0
        switch (filters.roi) {
          case 'Positivo':
            if (roi <= 0) return false
            break
          case 'Negativo':
            if (roi >= 0) return false
            break
          case 'Acima de 50%':
            if (roi < 50) return false
            break
          case 'Acima de 100%':
            if (roi < 100) return false
            break
        }
      }
      
      return true
    })
  }, [data?.campaigns, filters])

  // Calcular totais das campanhas FILTRADAS (para linha 1 - Rastreado)
  const filteredTotals = useMemo(() => {
    const campaigns = filteredCampaigns
    
    const totalGasto = campaigns.reduce((sum: number, c: Campaign) => sum + (c.gasto ?? 0), 0)
    const totalGanho = campaigns.reduce((sum: number, c: Campaign) => sum + (c.ganho ?? 0), 0)
    const totalLucro = totalGanho - totalGasto
    const roiGeral = totalGasto > 0 ? ((totalGanho - totalGasto) / totalGasto) * 100 : 0
    
    return { totalGasto, totalGanho, totalLucro, roiGeral }
  }, [filteredCampaigns])

  // Extrair opções únicas para os selects
  const filterOptions = useMemo(() => {
    if (!data?.campaigns) return { criadores: [], nichos: [], statuses: [] }
    
    const criadores = new Set<string>()
    const nichos = new Set<string>()
    const statuses = new Set<string>()
    
    data.campaigns.forEach((c: Campaign) => {
      // Status
      if (c.status) statuses.add(c.status)
      
      // Criador
      const criador = extractCriador(c.campanha || '')
      if (criador) criadores.add(criador)
      
      // Nicho
      const nicho = extractNicho(c.campanha || '')
      if (nicho) nichos.add(nicho)
    })
    
    return {
      criadores: Array.from(criadores).sort(),
      nichos: Array.from(nichos).sort(),
      statuses: Array.from(statuses).sort(),
    }
  }, [data?.campaigns])

  // Função de sincronizar
  const handleSync = async () => {
    setSyncing(true)
    
    try {
      // 1. Buscar TikTok
      toast.info('Buscando dados do TikTok...')
      const tiktokResponse = await fetch('/api/tiktok/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      const tiktokData = await tiktokResponse.json()
      
      if (!tiktokData.success && !tiktokData.campaigns) {
        throw new Error(tiktokData.error || 'Erro ao buscar TikTok')
      }

      // 2. Buscar GAM Campanhas
      toast.info('Buscando campanhas do GAM...')
      const gamResponse = await fetch('/api/gam/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      const gamData = await gamResponse.json()

      if (!gamData.success) {
        throw new Error(gamData.error || 'Erro ao buscar GAM')
      }

      // 3. Buscar GAM Faturamento Total
      toast.info('Buscando faturamento total...')
      const faturamentoResponse = await fetch('/api/gam/faturamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      const faturamentoData = await faturamentoResponse.json()

      // 4. Salvar no banco
      toast.info('Salvando dados...')
      
      const tiktokCampaigns = tiktokData.campaigns || []
      const totalTiktokSpend = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.gasto ?? 0), 0)
      const totalTiktokImpressions = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.impressoes ?? 0), 0)
      const totalTiktokClicks = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.cliques ?? 0), 0)

      const saveResponse = await fetch('/api/import/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          tiktok: {
            campaigns: tiktokCampaigns,
            totalSpend: totalTiktokSpend,
            totalImpressions: totalTiktokImpressions,
            totalClicks: totalTiktokClicks,
          },
          gam: {
            campaigns: gamData.campaigns || [],
            totalRevenue: gamData.totalReceita || 0,
            faturamentoTotal: faturamentoData.success ? faturamentoData.faturamentoTikTok : 0,
            totalImpressions: gamData.totalImpressoes || 0,
            totalClicks: gamData.totalCliques || 0,
          },
        }),
      })

      const saveResult = await saveResponse.json()

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Erro ao salvar')
      }

      toast.success(`Sincronizado! ROI: ${(saveResult.summary?.roiTracked ?? 0).toFixed(2)}%`)
      
      // Recarregar dados
      await fetchData(startDate, endDate)

    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com título, filtro de data e botão sincronizar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        
        <div className="flex items-center gap-4 flex-wrap">
          <DateFilter onDateChange={handleDateChange} isLoading={loading} />
          
          <Button onClick={handleSync} disabled={syncing || loading} variant="default">
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar
              </>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          {/* Cards - Linha 1 usa totais FILTRADOS, Linha 2 usa totais GERAIS */}
          <SummaryCards
            // Linha 1 - Rastreado (filtrado)
            totalGasto={filteredTotals.totalGasto}
            totalGanho={filteredTotals.totalGanho}
            totalLucro={filteredTotals.totalLucro}
            roiGeral={filteredTotals.roiGeral}
            
            // Linha 2 - Real (sempre total geral)
            faturamentoTiktok={data.totals?.gamFaturamentoTotal ?? 0}
            lucroReal={data.totals?.lucroReal ?? 0}
            roiReal={data.totals?.roiReal ?? 0}
          />

          {/* Filtros da tabela */}
          <CampaignFiltersNew
            filters={filters}
            onFiltersChange={setFilters}
            options={filterOptions}
            totalCampaigns={data.campaigns?.length ?? 0}
            filteredCount={filteredCampaigns.length}
          />

          {/* Tabela - recebe campanhas já filtradas */}
          <CampaignTable 
            campaigns={filteredCampaigns}
            onRefresh={() => fetchData(startDate, endDate)}
          />
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-lg">Nenhum dado encontrado para o período selecionado.</p>
            <p className="text-sm text-muted-foreground">Clique em "Sincronizar" para importar dados.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
