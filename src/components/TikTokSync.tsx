'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw, Download, CheckCircle, AlertCircle } from 'lucide-react'
import { getTodayBR } from '@/lib/date-utils'

interface TikTokSyncProps {
  isConnected: boolean
  onSyncComplete?: (data: any) => void
}

export function TikTokSync({ isConnected, onSyncComplete }: TikTokSyncProps) {
  const [startDate, setStartDate] = useState(() => getTodayBR())
  const [endDate, setEndDate] = useState(() => getTodayBR())
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSync = async () => {
    if (!isConnected) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/tiktok/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao sincronizar')
      }

      setResult({
        success: true,
        message: `${data.total} campanhas sincronizadas com sucesso!`,
      })

      if (onSyncComplete) {
        onSyncComplete(data)
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Erro ao sincronizar com TikTok',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="h-5 w-5" />
          Sincronizar TikTok
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Data Início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Data Fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={handleSync}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Buscar Dados do TikTok
            </>
          )}
        </Button>

        {result && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {result.success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="text-sm">{result.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


