import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  return authHeader === `Bearer ${cronSecret}`
}

function getYesterdayBR(): string {
  const now = new Date()
  // Ajustar para horário de Brasília (UTC-3)
  const brasilOffset = -3 * 60
  const localOffset = now.getTimezoneOffset()
  const diff = brasilOffset - localOffset
  now.setMinutes(now.getMinutes() + diff)
  
  // Subtrair 1 dia
  now.setDate(now.getDate() - 1)
  
  return now.toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  console.log('=== CRON: Sincronização do dia anterior ===')
  console.log('Horário:', new Date().toISOString())
  
  if (!isAuthorized(request)) {
    console.error('CRON: Não autorizado')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const yesterday = getYesterdayBR()
    
    console.log(`CRON: Sincronizando dia ${yesterday}`)

    // Buscar todos os usuários com credenciais TikTok
    const { data: credentials } = await supabase
      .from('tiktok_credentials')
      .select('user_id, access_token, advertiser_id')

    if (!credentials || credentials.length === 0) {
      return NextResponse.json({ message: 'Nenhum usuário para sincronizar' })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    
    const results = []

    for (const cred of credentials) {
      try {
        // Chamar o endpoint de sync com parâmetro de data
        const syncResponse = await fetch(`${baseUrl}/api/cron/sync?date=${yesterday}`, {
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          },
        })
        
        const syncResult = await syncResponse.json()
        results.push({ userId: cred.user_id, ...syncResult })
        
      } catch (err: any) {
        console.error(`CRON: Erro usuário ${cred.user_id}:`, err.message)
        results.push({ userId: cred.user_id, success: false, error: err.message })
      }
    }

    console.log('=== CRON: Sincronização do dia anterior concluída ===')

    return NextResponse.json({
      success: true,
      date: yesterday,
      results,
    })

  } catch (error: any) {
    console.error('CRON: Erro:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

