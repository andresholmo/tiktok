'use client'

import { useState, useEffect } from 'react'
import { Upload, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getDateTimeLocalBR } from '@/lib/date-utils'

interface FileUploadProps {
  onUploadComplete: (result: any) => void
}

// Função para converter valor brasileiro para número
function parseBRLCurrency(value: string): number {
  // Remove "R$", espaços e caracteres não numéricos exceto vírgula e ponto
  let cleaned = value
    .replace(/R\$\s?/gi, '')  // Remove R$ 
    .replace(/\s/g, '')        // Remove espaços
    .trim()
  
  // Detectar formato brasileiro: 8.818,21 (ponto como milhar, vírgula como decimal)
  // ou formato americano: 8,818.21 (vírgula como milhar, ponto como decimal)
  
  // Se tem vírgula E ponto, verificar qual é o decimal
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Se vírgula vem depois do ponto = formato brasileiro (8.818,21)
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      // Formato americano (8,818.21)
      cleaned = cleaned.replace(/,/g, '')
    }
  } else if (cleaned.includes(',')) {
    // Só tem vírgula - pode ser decimal brasileiro (8818,21) ou milhar americano (8,818)
    // Se tem exatamente 2 dígitos depois da vírgula, é decimal
    const parts = cleaned.split(',')
    if (parts[1] && parts[1].length === 2) {
      cleaned = cleaned.replace(',', '.')
    } else {
      // É milhar americano
      cleaned = cleaned.replace(',', '')
    }
  }
  // Se só tem ponto, deixa como está (formato americano ou decimal simples)
  
  return parseFloat(cleaned) || 0
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [tiktokFile, setTiktokFile] = useState<File | null>(null)
  const [gamFile, setGamFile] = useState<File | null>(null)
  const [date, setDate] = useState('')
  const [faturamentoTiktok, setFaturamentoTiktok] = useState('')
  const [faturamentoPreview, setFaturamentoPreview] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDate(getDateTimeLocalBR())
  }, [])

  const handleTikTokChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setTiktokFile(e.target.files[0])
  }

  const handleGAMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setGamFile(e.target.files[0])
  }

  const handleFaturamentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFaturamentoTiktok(value)
    
    // Mostrar preview do valor interpretado
    if (value.trim()) {
      const parsed = parseBRLCurrency(value)
      setFaturamentoPreview(parsed)
    } else {
      setFaturamentoPreview(null)
    }
  }

  const handleSubmit = async () => {
    if (!tiktokFile || !gamFile) {
      setError('Selecione os dois arquivos')
      return
    }

    if (!faturamentoTiktok) {
      setError('Informe o Faturamento TikTok')
      return
    }

    setLoading(true)
    setError('')

    try {
      const faturamentoNumero = parseBRLCurrency(faturamentoTiktok)

      if (faturamentoNumero <= 0) {
        throw new Error('Valor do faturamento inválido')
      }

      const formData = new FormData()
      formData.append('tiktok', tiktokFile)
      formData.append('gam', gamFile)
      formData.append('date', date)
      formData.append('faturamento_tiktok', faturamentoNumero.toString())

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro no upload')
      }

      onUploadComplete(result)
      setTiktokFile(null)
      setGamFile(null)
      setFaturamentoTiktok('')
      setFaturamentoPreview(null)
      
      setDate(getDateTimeLocalBR())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Formatar número para exibição
  const formatPreview = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tiktok">Relatório TikTok (XLSX)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="tiktok"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleTikTokChange}
                className="cursor-pointer"
              />
              {tiktokFile && (
                <FileSpreadsheet className="h-5 w-5 text-green-500" />
              )}
            </div>
            {tiktokFile && (
              <p className="text-sm text-muted-foreground">{tiktokFile.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gam">Relatório GAM (CSV/XLSX)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="gam"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleGAMChange}
                className="cursor-pointer"
              />
              {gamFile && (
                <FileSpreadsheet className="h-5 w-5 text-green-500" />
              )}
            </div>
            {gamFile && (
              <p className="text-sm text-muted-foreground">{gamFile.name}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Data/Hora da Importação</Label>
            <Input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="faturamento">Faturamento TikTok (GAM Total)</Label>
            <Input
              id="faturamento"
              type="text"
              placeholder="Ex: R$ 8.818,21"
              value={faturamentoTiktok}
              onChange={handleFaturamentoChange}
              className="w-full"
            />
            {faturamentoPreview !== null && faturamentoPreview > 0 && (
              <p className="text-sm text-green-600">
                ✓ Valor interpretado: {formatPreview(faturamentoPreview)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Cole direto do GAM (aceita R$ 8.818,21 ou 8818.21)
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={loading || !tiktokFile || !gamFile || !faturamentoTiktok}
          className="w-full md:w-auto"
        >
          {loading ? (
            'Processando...'
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Importar Dados
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
