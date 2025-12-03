import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface UpdateBudgetRequest {
  campaignIds: string[]
  budget: number  // Em reais
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { campaignIds, budget }: UpdateBudgetRequest = await request.json()

    if (!campaignIds || campaignIds.length === 0) {
      return NextResponse.json({ error: 'Nenhuma campanha selecionada' }, { status: 400 })
    }

    if (typeof budget !== 'number' || budget < 0) {
      return NextResponse.json({ error: 'Orçamento inválido' }, { status: 400 })
    }

    // Buscar access token do TikTok
    const { data: credentials, error: credError } = await supabase
      .from('tiktok_credentials')
      .select('access_token, advertiser_id')
      .eq('user_id', user.id)
      .single()

    if (credError || !credentials?.access_token || !credentials?.advertiser_id) {
      return NextResponse.json({ error: 'TikTok não conectado' }, { status: 400 })
    }

    // TikTok para BRL usa valor em reais (não centavos)
    // Arredondar para evitar decimais
    const budgetValue = Math.round(budget)

    const results = []
    const errors = []

    // Atualizar cada campanha individualmente
    for (const campaignId of campaignIds) {
      try {
        const response = await fetch(
          'https://business-api.tiktok.com/open_api/v1.3/campaign/update/',
          {
            method: 'POST',
            headers: {
              'Access-Token': credentials.access_token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              advertiser_id: credentials.advertiser_id,
              campaign_id: campaignId,
              budget: budgetValue,
            }),
          }
        )

        const data = await response.json()

        if (data.code !== 0) {
          console.error(`Erro campanha ${campaignId}:`, data.message)
          errors.push({ campaignId, error: data.message })
        } else {
          results.push(campaignId)
        }
      } catch (err) {
        errors.push({ campaignId, error: String(err) })
      }
    }

    console.log(`Orçamento atualizado para R$ ${budgetValue}:`, results)
    if (errors.length > 0) {
      console.error('Erros:', errors)
    }

    // Se todas falharam, retornar erro
    if (results.length === 0 && errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: errors[0].error,
        errors,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} campanha(s) atualizada(s) para R$ ${budgetValue}`,
      updated: results,
      errors: errors.length > 0 ? errors : undefined,
      budget: budgetValue,
    })

  } catch (error) {
    console.error('Erro ao atualizar orçamento:', error)
    return NextResponse.json(
      { error: 'Erro interno', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

