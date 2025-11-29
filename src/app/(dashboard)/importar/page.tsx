'use client'

import { useState } from 'react'
import { FileUpload } from '@/components/FileUpload'
import { SummaryCards } from '@/components/SummaryCards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

export default function ImportarPage() {
  const [result, setResult] = useState<any>(null)

  const handleUploadComplete = (uploadResult: any) => {
    setResult(uploadResult)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Importar Relatórios</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upload de Arquivos</CardTitle>
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
          />

          <div className="flex gap-4">
            <a
              href="/"
              className="text-blue-600 hover:underline"
            >
              Ver Dashboard →
            </a>
            <a
              href="/historico"
              className="text-blue-600 hover:underline"
            >
              Ver Histórico →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
