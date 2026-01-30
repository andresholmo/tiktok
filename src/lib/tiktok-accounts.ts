import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Busca o advertiser_id da conta TikTok ativa do usuário
 */
export async function getActiveAdvertiserId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: account, error } = await supabase
    .from('tiktok_accounts')
    .select('advertiser_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar conta ativa:', error)
    return null
  }

  return account?.advertiser_id || null
}

/**
 * Busca o access_token do TikTok do usuário
 */
export async function getTikTokAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: credentials, error } = await supabase
    .from('tiktok_credentials')
    .select('access_token')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar access token:', error)
    return null
  }

  return credentials?.access_token || null
}
