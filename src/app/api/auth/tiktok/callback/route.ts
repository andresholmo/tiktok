import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const authCode = searchParams.get('auth_code')

  if (!authCode) {
    console.error('Código de autorização não recebido')
    return NextResponse.redirect(new URL('/importar?error=no_code', request.url))
  }

  const appId = process.env.TIKTOK_APP_ID
  const appSecret = process.env.TIKTOK_APP_SECRET

  if (!appId || !appSecret) {
    console.error('Configuração do TikTok não encontrada')
    return NextResponse.redirect(new URL('/importar?error=config', request.url))
  }

  try {
    // Trocar auth_code por access_token
    const tokenResponse = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        secret: appSecret,
        auth_code: authCode,
      }),
    })

    const tokenData = await tokenResponse.json()

    console.log('Resposta do token TikTok:', JSON.stringify(tokenData, null, 2))

    if (tokenData.code !== 0) {
      console.error('Erro ao obter token:', tokenData)
      return NextResponse.redirect(new URL('/importar?error=token', request.url))
    }

    const accessToken = tokenData.data.access_token
    const advertiserIds = tokenData.data.advertiser_ids || []

    // Salvar token no Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user && accessToken) {
      const { error } = await supabase
        .from('tiktok_credentials')
        .upsert({
          user_id: user.id,
          access_token: accessToken,
          advertiser_id: advertiserIds[0] || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Erro ao salvar credenciais:', error)
        return NextResponse.redirect(new URL('/importar?error=save', request.url))
      }
    }

    return NextResponse.redirect(new URL('/importar?success=tiktok_connected', request.url))
  } catch (error) {
    console.error('Erro no callback TikTok:', error)
    return NextResponse.redirect(new URL('/importar?error=unknown', request.url))
  }
}

