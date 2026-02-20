import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.')
  if (!anon) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required.')

  // On the server/build: return a one-off client (no throw, no cache)
  if (typeof window === 'undefined') {
    return createClient(url, anon, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }

  // In the browser: singleton
  if (_client) return _client
  _client = createClient(url, anon)
  return _client
}
