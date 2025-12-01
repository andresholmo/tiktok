'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Link, Loader2, Unlink } from 'lucide-react'

interface TikTokConnectProps {
  onConnectionChange?: (connected: boolean) => void
}

export function TikTokConnect({ onConnectionChange }: TikTokConnectProps) {
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
        
        const connected = !!data
        setIsConnected(connected)
        if (onConnectionChange) {
          onConnectionChange(connected)
        }
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

  const handleDisconnect = async () => {
    if (!confirm('Deseja desconectar sua conta do TikTok?')) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('tiktok_credentials')
          .delete()
          .eq('user_id', user.id)
        
        setIsConnected(false)
        if (onConnectionChange) {
          onConnectionChange(false)
        }
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error)
    }
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
      <CardContent className="space-y-3">
        {isConnected ? (
          <>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Conectado</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDisconnect}
              className="w-full text-red-600 hover:text-red-700"
            >
              <Unlink className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          </>
        ) : (
          <Button onClick={handleConnect} variant="outline" className="w-full">
            <Link className="h-4 w-4 mr-2" />
            Conectar TikTok Ads
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
