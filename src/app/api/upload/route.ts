import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

import { parseTikTokFile, parseGAMFile, mergeData } from '@/lib/parseFiles'

import { calculateTotals } from '@/lib/calculations'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Pegar arquivos do form
    const formData = await request.formData()
    const tiktokFile = formData.get('tiktok') as File
    const gamFile = formData.get('gam') as File
    const date = formData.get('date') as string

    if (!tiktokFile || !gamFile || !date) {
      return NextResponse.json({ error: 'Arquivos e data são obrigatórios' }, { status: 400 })
    }

    // Converter para ArrayBuffer
    const tiktokBuffer = await tiktokFile.arrayBuffer()
    const gamBuffer = await gamFile.arrayBuffer()

    // Parsear arquivos
    const tiktokData = parseTikTokFile(tiktokBuffer)
    const gamData = parseGAMFile(gamBuffer)

    // Fazer merge
    const campaigns = mergeData(tiktokData, gamData)

    // Calcular totais
    const totals = calculateTotals(campaigns as any)

    // Inserir importação
    const { data: importData, error: importError } = await supabase
      .from('imports')
      .insert({
        date,
        user_id: user.id,
        total_gasto: totals.totalGasto,
        total_ganho: totals.totalGanho,
        total_lucro: totals.totalLucro,
        roi_geral: totals.roiGeral,
      })
      .select()
      .single()

    if (importError) {
      console.error('Erro ao inserir import:', importError)
      return NextResponse.json({ error: 'Erro ao salvar importação' }, { status: 500 })
    }

    // Inserir campanhas
    const campaignsToInsert = campaigns.map(c => ({
      ...c,
      import_id: importData.id,
    }))

    const { error: campaignsError } = await supabase
      .from('campaigns')
      .insert(campaignsToInsert)

    if (campaignsError) {
      console.error('Erro ao inserir campanhas:', campaignsError)
      return NextResponse.json({ error: 'Erro ao salvar campanhas' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      import_id: importData.id,
      totals,
      campaigns_count: campaigns.length,
    })

  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
