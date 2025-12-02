'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw, Download, CheckCircle, AlertCircle } from 'lucide-react'

interface GAMSyncProps {
  onSyncComplete?: (data: any) => void
}

export function GAMSync({ onSyncComplete }: GAMSyncProps) {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSync = async (reportType: 'campanhas' | 'faturamento') => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/gam/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, reportType }),
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          type: reportType,
          data
        })
        if (onSyncComplete) onSyncComplete(data)
      } else {
        setResult({ success: false, message: data.error })
      }
    } catch (error: any) {
      setResult({ success: false, message: error.message })
    } finally {
      setLoading(false)
    }
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

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => handleSync('campanhas')} disabled={loading} variant="outline">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Campanhas
          </Button>
          <Button onClick={() => handleSync('faturamento')} disabled={loading} variant="outline">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Faturamento
          </Button>
        </div>

        {result && (
          <div className={`p-3 rounded-lg ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.success ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>{result.data.total} registros encontrados</span>
                </div>
                {result.data.faturamentoTotal && (
                  <div className="text-lg font-bold">
                    Faturamento TikTok: R$ {result.data.faturamentoTotal.toFixed(2)}
                  </div>
                )}
                {result.data.campaigns?.slice(0, 5).map((c: any, i: number) => (
                  <div key={i} className="text-sm">
                    {c.campanha || c.source}: R$ {c.receita.toFixed(2)}
                  </div>
                ))}
                {result.data.total > 5 && (
                  <div className="text-sm text-muted-foreground">
                    ... e mais {result.data.total - 5}
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
