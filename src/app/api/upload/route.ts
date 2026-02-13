import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseTikTokFile, parseGAMFile, mergeData } from '@/lib/parseFiles'
import { calculateTotals } from '@/lib/calculations'
import { getActiveAdvertiserId } from '@/lib/tiktok-accounts'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const tiktokFile = formData.get('tiktok') as File
    const gamFile = formData.get('gam') as File
    const date = formData.get('date') as string
    const faturamentoTiktok = parseFloat(formData.get('faturamento_tiktok') as string) || 0

    if (!tiktokFile || !gamFile || !date) {
      return NextResponse.json({ error: 'Arquivos e data são obrigatórios' }, { status: 400 })
    }

    const tiktokBuffer = await tiktokFile.arrayBuffer()
    const gamBuffer = await gamFile.arrayBuffer()

    const tiktokData = parseTikTokFile(tiktokBuffer)
    const gamData = parseGAMFile(gamBuffer)
    const campaigns = mergeData(tiktokData, gamData)
    const totals = calculateTotals(campaigns as any)

    const advertiserId = await getActiveAdvertiserId(supabase, user.id)

    // Calcular ROI Real e Lucro Real
    const lucroReal = faturamentoTiktok - totals.totalGasto
    const roiReal = totals.totalGasto > 0 ? ((faturamentoTiktok - totals.totalGasto) / totals.totalGasto) * 100 : 0

    const insertPayload: Record<string, unknown> = {
      date,
      user_id: user.id,
        total_gasto: totals.totalGasto,
        total_ganho: totals.totalGanho,
        total_lucro: totals.totalLucro,
        roi_geral: totals.roiGeral,
        faturamento_tiktok: faturamentoTiktok,
        lucro_real: lucroReal,
        roi_real: roiReal,
      }
    if (advertiserId != null) {
      insertPayload.advertiser_id = advertiserId
    }
    const { data: importData, error: importError } = await supabase
      .from('imports')
      .insert(insertPayload)
      .select()
      .single()

    if (importError) {
      console.error('Erro ao inserir import:', importError)
      return NextResponse.json({ error: 'Erro ao salvar importação' }, { status: 500 })
    }

    const campaignsToInsert = campaigns.map((c: Record<string, unknown>) => ({
      ...c,
      import_id: importData.id,
      ...(advertiserId != null && { advertiser_id: advertiserId }),
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
      totals: {
        ...totals,
        faturamentoTiktok,
        lucroReal,
        roiReal,
      },
      campaigns_count: campaigns.length,
    })

  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
