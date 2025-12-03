import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ connected: false, error: 'Não autorizado' })
    }

    const { data: credentials } = await supabase
      .from('tiktok_credentials')
      .select('advertiser_id, updated_at')
      .eq('user_id', user.id)
      .single()

    if (!credentials) {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({
      connected: true,
      advertiser_id: credentials.advertiser_id,
      connected_at: credentials.updated_at,
    })

  } catch (error) {
    console.error('Erro ao verificar credenciais:', error)
    return NextResponse.json({ connected: false, error: 'Erro interno' })
  }
}


