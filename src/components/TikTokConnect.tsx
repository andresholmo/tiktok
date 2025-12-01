'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Link, Loader2 } from 'lucide-react'

export function TikTokConnect() {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('tiktok_credentials')
          .select('id')
          .eq('user_id', user.id)
          .single()
        
        setIsConnected(!!data)
      }
    } catch (error) {
      console.error('Erro ao verificar conexão:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    window.location.href = '/api/auth/tiktok'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">TikTok Ads</CardTitle>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>Conectado</span>
          </div>
        ) : (
          <Button onClick={handleConnect} variant="outline">
            <Link className="h-4 w-4 mr-2" />
            Conectar TikTok Ads
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

