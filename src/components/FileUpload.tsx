'use client'

import { useState, useEffect } from 'react'
import { Upload, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FileUploadProps {
  onUploadComplete: (result: any) => void
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [tiktokFile, setTiktokFile] = useState<File | null>(null)
  const [gamFile, setGamFile] = useState<File | null>(null)
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Preencher data/hora automaticamente ao carregar
  useEffect(() => {
    const now = new Date()
    // Formato: YYYY-MM-DDTHH:MM para input datetime-local
    const formatted = now.toISOString().slice(0, 16)
    setDate(formatted)
  }, [])

  const handleTikTokChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setTiktokFile(e.target.files[0])
  }

  const handleGAMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setGamFile(e.target.files[0])
  }

  const handleSubmit = async () => {
    if (!tiktokFile || !gamFile) {
      setError('Selecione os dois arquivos')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('tiktok', tiktokFile)
      formData.append('gam', gamFile)
      formData.append('date', date)

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
      
      // Atualizar data para próximo upload
      const now = new Date()
      setDate(now.toISOString().slice(0, 16))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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

        <div className="space-y-2">
          <Label htmlFor="date">Data/Hora da Importação</Label>
          <Input
            id="date"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full md:w-64"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={loading || !tiktokFile || !gamFile}
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
