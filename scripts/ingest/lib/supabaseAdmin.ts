import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('SUPABASE_URL is missing in environment.')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing in environment.')

  return createClient(url, key, { auth: { persistSession: false } })
}
