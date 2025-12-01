import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const authCode = searchParams.get('auth_code')

  if (!authCode) {
    return NextResponse.redirect(new URL('/importar?error=no_code', request.url))
  }

  const appId = process.env.TIKTOK_APP_ID
  const appSecret = process.env.TIKTOK_APP_SECRET

  if (!appId || !appSecret) {
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

    if (tokenData.code !== 0) {
      console.error('Erro ao obter token:', tokenData)
      return NextResponse.redirect(new URL('/importar?error=token', request.url))
    }

    const accessToken = tokenData.data.access_token
    const advertiserId = tokenData.data.advertiser_ids?.[0]

    // Salvar token no Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase
        .from('tiktok_credentials')
        .upsert({
          user_id: user.id,
          access_token: accessToken,
          advertiser_id: advertiserId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })
    }

    return NextResponse.redirect(new URL('/importar?success=tiktok_connected', request.url))
  } catch (error) {
    console.error('Erro no callback TikTok:', error)
    return NextResponse.redirect(new URL('/importar?error=unknown', request.url))
  }
}

