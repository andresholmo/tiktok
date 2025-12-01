import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const appId = process.env.TIKTOK_APP_ID
  const redirectUri = process.env.TIKTOK_REDIRECT_URI

  if (!appId || !redirectUri) {
    return NextResponse.json({ error: 'Configuração do TikTok não encontrada' }, { status: 500 })
  }

  // Gerar state para segurança
  const state = Math.random().toString(36).substring(7)

  // URL de autorização do TikTok
  const authUrl = new URL('https://business-api.tiktok.com/portal/auth')
  authUrl.searchParams.set('app_id', appId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}

