import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - Listar contas
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: accounts, error } = await supabase
      .from('tiktok_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ accounts: accounts || [] })
  } catch (error) {
    console.error('Erro ao listar contas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Adicionar conta
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { name, advertiser_id } = await request.json()

    if (!name || !advertiser_id) {
      return NextResponse.json({ error: 'Nome e Advertiser ID são obrigatórios' }, { status: 400 })
    }

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('tiktok_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('advertiser_id', advertiser_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Esta conta já está cadastrada' }, { status: 400 })
    }

    // Verificar se é a primeira conta (será ativa por padrão)
    const { count } = await supabase
      .from('tiktok_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const isFirst = (count || 0) === 0

    const { data: account, error } = await supabase
      .from('tiktok_accounts')
      .insert({
        user_id: user.id,
        name,
        advertiser_id,
        is_active: isFirst,  // Primeira conta é ativa automaticamente
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Erro ao adicionar conta:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Remover conta
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('id')

    if (!accountId) {
      return NextResponse.json({ error: 'ID da conta é obrigatório' }, { status: 400 })
    }

    // Verificar se a conta pertence ao usuário
    const { data: account } = await supabase
      .from('tiktok_accounts')
      .select('is_active')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }

    // Deletar
    const { error } = await supabase
      .from('tiktok_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', user.id)

    if (error) throw error

    // Se era a conta ativa, ativar outra
    if (account.is_active) {
      const { data: nextAccount } = await supabase
        .from('tiktok_accounts')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (nextAccount) {
        await supabase
          .from('tiktok_accounts')
          .update({ is_active: true })
          .eq('id', nextAccount.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover conta:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH - Ativar conta
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: 'ID da conta é obrigatório' }, { status: 400 })
    }

    // Primeiro, desativar todas as contas do usuário
    await supabase
      .from('tiktok_accounts')
      .update({ is_active: false })
      .eq('user_id', user.id)

    // Depois, ativar a conta selecionada
    const { data: account, error } = await supabase
      .from('tiktok_accounts')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ account })
  } catch (error) {
    console.error('Erro ao ativar conta:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
