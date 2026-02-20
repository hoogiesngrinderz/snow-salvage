'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase'

type PartRow = {
  id: string
  title: string
  category: string | null
  condition: string | null
  price: number
  quantity: number
  created_at: string
}

export default function PartsPage() {
  // ✅ Required by Next when the page uses useSearchParams (CSR bailout)
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <PartsPageInner />
    </Suspense>
  )
}

function PartsPageInner() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const sp = useSearchParams()

  // Example query params:
  // /parts?q=ecm
  const q = (sp.get('q') ?? '').trim()

  const [rows, setRows] = useState<PartRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErr(null)

      // Only show listed + in-stock on public parts page
      let query = supabase
        .from('parts')
        .select('id,title,category,condition,price,quantity,created_at')
        .eq('is_listed', true)
        .gt('quantity', 0)
        .order('created_at', { ascending: false })
        .limit(1000)

      // Optional simple search (client-side filter fallback)
      // If you have a Postgres function / FTS, swap this for that.
      const { data, error } = await query

      if (error) {
        setErr(error.message)
        setRows([])
        setLoading(false)
        return
      }

      const base = (data ?? []) as PartRow[]
      const filtered =
        q.length === 0
          ? base
          : base.filter((r) => {
              const blob = [r.title, r.category, r.condition]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
              return blob.includes(q.toLowerCase())
            })

      setRows(filtered)
      setLoading(false)
    }

    load()
  }, [supabase, q])

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Parts</h1>
          <p className="text-sm text-gray-600 mt-1">Browse available parts currently in stock.</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Link className="border rounded px-3 py-2" href="/">
            ← Home
          </Link>
        </div>
      </div>

      {q ? (
        <div className="mt-4 text-sm text-gray-600">
          Showing results for: <span className="font-mono">{q}</span>
        </div>
      ) : null}

      {err && <div className="mt-4 text-sm text-red-700">Error: {err}</div>}

      <div className="mt-6 border rounded overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 text-sm font-medium px-3 py-2">
          <div className="col-span-7">Part</div>
          <div className="col-span-2">Price</div>
          <div className="col-span-2">Qty</div>
          <div className="col-span-1 text-right">Open</div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-600">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">No parts found.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="grid grid-cols-12 px-3 py-3 border-t text-sm items-center">
              <div className="col-span-7 min-w-0">
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-xs text-gray-600">
                  {r.category ?? '—'} • {r.condition ?? '—'} • Added {new Date(r.created_at).toLocaleString()}
                </div>
              </div>

              <div className="col-span-2 font-semibold">${Number(r.price).toFixed(2)}</div>
              <div className="col-span-2">{r.quantity}</div>

              <div className="col-span-1 text-right">
                <Link className="underline" href={`/parts/${r.id}`}>
                  View
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
