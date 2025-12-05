import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('sync_status')
      .select('last_sync_at, sync_type, status')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erro ao buscar sync status:', error)
      return NextResponse.json({ error: 'Erro ao buscar status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      lastSyncAt: data?.last_sync_at || null,
      syncType: data?.sync_type || null,
      status: data?.status || null,
    })

  } catch (error: any) {
    console.error('Erro:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

