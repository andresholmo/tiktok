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
    setProgress('Conectando ao GAM...')

    try {
      const response = await fetch('/api/gam/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })

      setProgress('Processando relatório...')

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          data
        })
        if (onSyncComplete) onSyncComplete(data)
      } else {
        setResult({ success: false, message: data.error || 'Erro desconhecido', details: data.details })
      }
    } catch (error: any) {
      setResult({ success: false, message: error.message })
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">{result.data.total} campanhas</span>
                  </div>
                  <div className="text-lg font-bold">
                    {formatCurrency(result.data.totalReceita)}
                  </div>
                </div>
                
                {result.data.campaigns?.length > 0 && (
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-green-100">
                        <tr>
                          <th className="text-left p-1">Campanha</th>
                          <th className="text-right p-1">Receita</th>
                          <th className="text-right p-1">eCPM</th>
                          <th className="text-right p-1">CTR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.campaigns.slice(0, 10).map((c: Campaign, i: number) => (
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
                    {result.data.total > 10 && (
                      <div className="text-center text-xs mt-2 text-green-600">
                        ... e mais {result.data.total - 10} campanhas
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{result.message}</span>
                </div>
                {result.details && (
                  <pre className="text-xs bg-red-100 p-2 rounded overflow-auto max-h-32">
                    {typeof result.details === 'string' ? result.details : JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
