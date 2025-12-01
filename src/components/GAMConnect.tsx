'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export function GAMConnect() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [networkName, setNetworkName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    try {
      const response = await fetch('/api/gam/test')
      const data = await response.json()

      if (data.success) {
        setStatus('connected')
        setNetworkName(data.network?.displayName || 'GAM')
      } else {
        setStatus('error')
        setError(data.error || 'Erro de conexão')
      }
    } catch (err) {
      setStatus('error')
      setError('Erro ao verificar conexão')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Google Ad Manager</CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'loading' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Verificando conexão...</span>
          </div>
        )}

        {status === 'connected' && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>Conectado: {networkName}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Erro na conexão</span>
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={checkConnection}>
              Tentar novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

