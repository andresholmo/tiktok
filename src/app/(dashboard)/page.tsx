'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  
  // Estado dos filtros
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'Todos',
    criador: 'Todos',
    nicho: 'Todos',
    roi: 'Todos',
  })

  // Estado para campanhas selecionadas
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([])

  // Callback para receber seleção da tabela
  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedCampaignIds(ids)
  }, [])

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

  // Função para buscar status da sincronização
  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/status')
      const data = await response.json()
      if (data.success && data.lastSyncAt) {
        setLastSyncAt(data.lastSyncAt)
      }
    } catch (err) {
      console.error('Erro ao buscar sync status:', err)
    }
  }

  // Função para formatar data e hora completa
  const formatSyncDateTime = (isoDate: string) => {
    const date = new Date(isoDate)
    const hoje = new Date()
    const ontem = new Date(hoje)
    ontem.setDate(ontem.getDate() - 1)
    
    const syncDate = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const hojeStr = hoje.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const ontemStr = ontem.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    
    const hora = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
    
    if (syncDate === hojeStr) {
      return `Sincronizado às ${hora}`
    } else if (syncDate === ontemStr) {
      return `Sincronizado ontem às ${hora}`
    } else {
      return `Sincronizado em ${syncDate} às ${hora}`
    }
  }

  useEffect(() => {
    fetchData(startDate, endDate)
    fetchSyncStatus()
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

  // Limpar seleção quando filtros mudarem
  useEffect(() => {
    setSelectedCampaignIds([])
  }, [filters.search, filters.status, filters.criador, filters.nicho, filters.roi])

  // Calcular totais - usa seleção se houver, senão usa todas filtradas
  const displayTotals = useMemo(() => {
    // Determinar quais campanhas usar para os cálculos
    let campaignsToCalculate = filteredCampaigns
    
    // Se há campanhas selecionadas, usar apenas essas
    if (selectedCampaignIds.length > 0) {
      campaignsToCalculate = filteredCampaigns.filter((c: Campaign) => 
        selectedCampaignIds.includes(c.tiktok_campaign_id || '')
      )
    }
    
    // Cálculos normais (todas as campanhas selecionadas/filtradas)
    const totalGasto = campaignsToCalculate.reduce((sum: number, c: Campaign) => sum + (c.gasto ?? 0), 0)
    const totalGanho = campaignsToCalculate.reduce((sum: number, c: Campaign) => sum + (c.ganho ?? 0), 0)
    const totalLucro = totalGanho - totalGasto
    const roiGeral = totalGasto > 0 ? ((totalGanho - totalGasto) / totalGasto) * 100 : 0
    
    // ORÇAMENTO DIÁRIO: Soma de TODAS as campanhas (ativas + pausadas)
    const orcamentoDiario = campaignsToCalculate.reduce((sum: number, c: Campaign) => sum + (c.orcamento_diario ?? 0), 0)
    
    // ORÇAMENTO RESTANTE: Apenas campanhas ATIVAS
    const campanhasAtivas = campaignsToCalculate.filter((c: Campaign) => 
      c.status === 'ATIVO' || c.status === 'ENABLE' || c.status === 'ACTIVE'
    )
    
    const orcamentoAtivas = campanhasAtivas.reduce((sum: number, c: Campaign) => sum + (c.orcamento_diario ?? 0), 0)
    const gastoAtivas = campanhasAtivas.reduce((sum: number, c: Campaign) => sum + (c.gasto ?? 0), 0)
    
    // Restante = Orçamento das ativas - Gasto das ativas
    const orcamentoRestante = orcamentoAtivas - gastoAtivas
    
    return { 
      totalGasto, 
      totalGanho, 
      totalLucro, 
      roiGeral,
      orcamentoDiario,      // Todas as campanhas
      orcamentoRestante,    // Apenas ativas
      count: campaignsToCalculate.length,
      isFiltered: selectedCampaignIds.length > 0
    }
  }, [filteredCampaigns, selectedCampaignIds])

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

  // Sincronizar TODAS as contas TikTok
  const handleSync = async () => {
    setSyncing(true)
    try {
      const accountsResponse = await fetch('/api/tiktok/accounts')
      const accountsData = await accountsResponse.json()
      if (!accountsData.accounts || accountsData.accounts.length === 0) {
        toast.error('Nenhuma conta TikTok conectada')
        return
      }
      const accounts = accountsData.accounts
      toast.info(`Sincronizando ${accounts.length} conta(s)...`)

      // GAM uma vez (compartilhado entre contas)
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
      toast.info('Buscando faturamento total...')
      const faturamentoResponse = await fetch('/api/gam/faturamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      const faturamentoData = await faturamentoResponse.json()

      let totalCampaigns = 0
      const errors: string[] = []

      for (const account of accounts) {
        try {
          toast.info(`Sincronizando: ${account.name || account.advertiser_id}...`)
          const tiktokResponse = await fetch('/api/tiktok/report', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-advertiser-id': account.advertiser_id,
            },
            body: JSON.stringify({ startDate, endDate }),
          })
          const tiktokData = await tiktokResponse.json()
          const tiktokCampaigns = tiktokData.campaigns || []
          if (!tiktokData.success && tiktokCampaigns.length === 0 && tiktokData.error) {
            errors.push(`${account.name || account.advertiser_id}: ${tiktokData.error}`)
            continue
          }

          const totalSpend = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.gasto ?? 0), 0)
          const totalImpressions = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.impressoes ?? 0), 0)
          const totalClicks = tiktokCampaigns.reduce((sum: number, c: any) => sum + (c.cliques ?? 0), 0)

          const saveResponse = await fetch('/api/import/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-advertiser-id': account.advertiser_id,
            },
            body: JSON.stringify({
              startDate,
              endDate,
              advertiserId: account.advertiser_id,
              tiktok: {
                campaigns: tiktokCampaigns,
                totalSpend,
                totalImpressions,
                totalClicks,
              },
              gam: {
                campaigns: gamData.campaigns || gamData.finalCampaigns || [],
                totalRevenue: gamData.totalReceita || 0,
                faturamentoTotal: faturamentoData.success ? faturamentoData.faturamentoTikTok : 0,
                totalImpressions: gamData.totalImpressoes || 0,
                totalClicks: gamData.totalCliques || 0,
              },
            }),
          })
          const saveResult = await saveResponse.json()
          if (saveResult.success) {
            totalCampaigns += tiktokCampaigns.length
          } else {
            errors.push(`${account.name || account.advertiser_id}: ${saveResult.error}`)
          }
        } catch (err: any) {
          errors.push(`${account.name || account.advertiser_id}: ${err.message}`)
        }
      }

      if (errors.length > 0) {
        toast.warning(`Sincronizado com ${errors.length} erro(s)`)
        console.error('Erros:', errors)
      } else {
        toast.success(`Sincronizado! ${totalCampaigns} campanhas de ${accounts.length} conta(s)`)
      }
      setLastSyncAt(new Date().toISOString())
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
          
          {/* Texto de última sincronização */}
          {lastSyncAt && (
            <span className="text-sm text-muted-foreground">
              {formatSyncDateTime(lastSyncAt)}
            </span>
          )}
          
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
            totalGasto={displayTotals.totalGasto}
            totalGanho={displayTotals.totalGanho}
            totalLucro={displayTotals.totalLucro}
            roiGeral={displayTotals.roiGeral}
            orcamentoDiario={displayTotals.orcamentoDiario}
            orcamentoRemanescente={displayTotals.orcamentoRestante}
            selectedCount={displayTotals.count}
            isSelection={displayTotals.isFiltered}
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
            onSelectionChange={handleSelectionChange}
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
