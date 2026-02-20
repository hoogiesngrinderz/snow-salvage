import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    throw new Error('Missing Supabase env vars')
  }

  // ✅ SERVER: return a throwaway client (DO NOT crash)
  if (typeof window === 'undefined') {
    return createClient(url, anon)
  }

  // ✅ BROWSER: reuse singleton
  if (!browserClient) {
    browserClient = createClient(url, anon)
  }

  return browserClient
}
