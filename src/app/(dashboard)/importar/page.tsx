'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { FileUpload } from '@/components/FileUpload'
import { TikTokConnect } from '@/components/TikTokConnect'
import { SummaryCards } from '@/components/SummaryCards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ImportarPage() {
  const [result, setResult] = useState<any>(null)
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload Manual</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload onUploadComplete={handleUploadComplete} />
            </CardContent>
          </Card>
        </div>

        <div>
          <TikTokConnect />
        </div>
      </div>

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
