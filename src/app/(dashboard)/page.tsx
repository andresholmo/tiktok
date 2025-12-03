'use client'

import { useState, useEffect } from 'react'
import { DateFilter } from '@/components/DateFilter'
import { SummaryCards } from '@/components/SummaryCards'
import { CampaignTable } from '@/components/CampaignTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getTodayBR } from '@/lib/date-utils'
import { Loader2, AlertCircle } from 'lucide-react'

export default function DashboardPage() {
  const today = getTodayBR()
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <DateFilter onDateChange={handleDateChange} isLoading={loading} />
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
          <SummaryCards
            totalGasto={data.totals.tiktokSpend}
            totalGanho={data.totals.gamRevenue}
            totalLucro={data.totals.lucroRastreado}
            roiGeral={data.totals.roiRastreado}
            faturamentoTiktok={data.totals.gamFaturamentoTotal}
            lucroReal={data.totals.lucroReal}
            roiReal={data.totals.roiReal}
          />

          <Card>
            <CardHeader>
              <CardTitle>Campanhas ({data.campaigns.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignTable campaigns={data.campaigns} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-lg">Nenhum dado encontrado para o período selecionado.</p>
            <a href="/importar" className="text-blue-600 hover:underline">
              Fazer primeira importação →
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
