'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface Campaign {
  data: string
  campanha: string
  impressoes: number
  cliques: number
  ctr: number
  receita: number
  ecpm: number
}

interface GAMSyncProps {
  onSyncComplete?: (data: any) => void
}

export function GAMSync({ onSyncComplete }: GAMSyncProps) {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<any>(null)

  const handleSync = async () => {
    setLoading(true)
    setResult(null)
    setProgress('Buscando campanhas...')

    try {
      // 1. Buscar campanhas
      const campanhasResponse = await fetch('/api/gam/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })

      const campanhasData = await campanhasResponse.json()

      if (!campanhasData.success) {
        throw new Error(campanhasData.error || 'Erro ao buscar campanhas')
      }

      setProgress('Buscando faturamento total...')

      // 2. Buscar faturamento total TikTok
      const faturamentoResponse = await fetch('/api/gam/faturamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })

      const faturamentoData = await faturamentoResponse.json()

      // Combinar resultados
      const combinedData = {
        ...campanhasData,
        faturamentoTikTok: faturamentoData.success ? faturamentoData.faturamentoTikTok : 0,
      }

      setResult({
        success: true,
        data: combinedData
      })

      if (onSyncComplete) onSyncComplete(combinedData)

    } catch (error: any) {
      setResult({ success: false, message: error.message })
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="h-5 w-5" />
          Sincronizar GAM
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

        <Button onClick={handleSync} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {progress || 'Processando...'}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Buscar Dados do GAM
            </>
          )}
        </Button>

        {result && (
          <div className={`p-3 rounded-lg ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.success ? (
              <div className="space-y-3">
                {/* Faturamento TikTok Total */}
                <div className="bg-green-100 p-2 rounded flex justify-between items-center">
                  <span className="font-medium">Faturamento TikTok (GAM Total)</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(result.data.faturamentoTikTok || 0)}
                  </span>
                </div>

                {/* Resumo das campanhas */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">{result.data.total} campanhas</span>
                  </div>
                  <div className="text-lg font-bold">
                    {formatCurrency(result.data.totalReceita)}
                  </div>
                </div>
                
                {/* Tabela de campanhas */}
                {result.data.campaigns?.length > 0 && (
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-green-100 sticky top-0">
                        <tr>
                          <th className="text-left p-1">Campanha</th>
                          <th className="text-right p-1">Receita</th>
                          <th className="text-right p-1">eCPM</th>
                          <th className="text-right p-1">CTR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.campaigns.map((c: Campaign, i: number) => (
                          <tr key={i} className="border-b border-green-100">
                            <td className="p-1 truncate max-w-[120px]" title={c.campanha}>
                              {c.campanha}
                            </td>
                            <td className="text-right p-1">{formatCurrency(c.receita)}</td>
                            <td className="text-right p-1">{formatCurrency(c.ecpm)}</td>
                            <td className="text-right p-1">{c.ctr.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>{result.message}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
