'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { FileUpload } from '@/components/FileUpload'
import { TikTokConnect } from '@/components/TikTokConnect'
import { TikTokSync } from '@/components/TikTokSync'
import { SummaryCards } from '@/components/SummaryCards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ImportarPage() {
  const [result, setResult] = useState<any>(null)
  const [tiktokConnected, setTiktokConnected] = useState(false)
  const [tiktokData, setTiktokData] = useState<any>(null)
  const searchParams = useSearchParams()
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'tiktok_connected') {
      setMessage({ type: 'success', text: 'TikTok conectado com sucesso!' })
    } else if (error === 'no_code') {
      setMessage({ type: 'error', text: 'Erro: código de autorização não recebido' })
    } else if (error === 'token') {
      setMessage({ type: 'error', text: 'Erro ao obter token do TikTok' })
    } else if (error) {
      setMessage({ type: 'error', text: 'Erro ao conectar com TikTok' })
    }
  }, [searchParams])

  const handleUploadComplete = (uploadResult: any) => {
    setResult(uploadResult)
  }

  const handleTikTokSync = (data: any) => {
    setTiktokData(data)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Importar Relatórios</h1>

      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Conexão e Sincronização TikTok */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TikTokConnect onConnectionChange={setTiktokConnected} />
        <TikTokSync isConnected={tiktokConnected} onSyncComplete={handleTikTokSync} />
      </div>

      {/* Dados sincronizados do TikTok */}
      {tiktokData && tiktokData.campaigns && tiktokData.campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Dados do TikTok ({tiktokData.total} campanhas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              Período: {tiktokData.periodo?.startDate} a {tiktokData.periodo?.endDate}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Campanha</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-right p-2">Gasto</th>
                    <th className="text-right p-2">CPC</th>
                    <th className="text-right p-2">CTR</th>
                    <th className="text-right p-2">Orçamento</th>
                  </tr>
                </thead>
                <tbody>
                  {tiktokData.campaigns.slice(0, 10).map((c: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{c.campanha}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          c.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="text-right p-2">R$ {c.gasto.toFixed(2)}</td>
                      <td className="text-right p-2">R$ {c.cpc.toFixed(2)}</td>
                      <td className="text-right p-2">{c.ctr.toFixed(2)}%</td>
                      <td className="text-right p-2">R$ {c.orcamento_diario.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tiktokData.campaigns.length > 10 && (
                <p className="text-sm text-muted-foreground mt-2">
                  ... e mais {tiktokData.campaigns.length - 10} campanhas
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Manual */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Manual</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload onUploadComplete={handleUploadComplete} />
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">
              Importação concluída! {result.campaigns_count} campanhas processadas.
            </span>
          </div>

          <SummaryCards
            totalGasto={result.totals.totalGasto}
            totalGanho={result.totals.totalGanho}
            totalLucro={result.totals.totalLucro}
            roiGeral={result.totals.roiGeral}
            faturamentoTiktok={result.totals.faturamentoTiktok}
            lucroReal={result.totals.lucroReal}
            roiReal={result.totals.roiReal}
          />

          <div className="flex gap-4">
            <a href="/" className="text-blue-600 hover:underline">
              Ver Dashboard →
            </a>
            <a href="/historico" className="text-blue-600 hover:underline">
              Ver Histórico →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
