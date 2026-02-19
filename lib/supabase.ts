import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient {
  // Prevent build/prerender crashes by only creating client in the browser
  if (typeof window === 'undefined') {
    // This should never be called on the server/build
    throw new Error('Supabase client requested on the server. Use in a Client Component only.')
  }

  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.')
  if (!anon) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required.')

  _client = createClient(url, anon)
  return _client
}
