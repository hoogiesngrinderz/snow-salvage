'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type DonorMini = {
  id: string
  make: string | null
  model: string | null
  year: number | null
}

type PartRow = {
  id: string
  donor_sled_id: string
  title: string
  category: string | null
  condition: string | null
  price: number
  quantity: number
  bin_location: string | null
  is_listed: boolean
  created_at: string
  donor_sleds?: DonorMini | null
}

export default function PartsBrowsePage() {
  const router = useRouter()
  const sp = useSearchParams()

  const make = (sp.get('make') ?? '').trim()
  const model = (sp.get('model') ?? '').trim()
  const yearRaw = (sp.get('year') ?? '').trim()
  const donorId = (sp.get('donor') ?? '').trim()
  const qParam = (sp.get('q') ?? '').trim()

  const year = yearRaw ? Number(yearRaw) : null
  const yearValid = yearRaw ? Number.isFinite(year) : true

  const [rows, setRows] = useState<PartRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState(qParam)

  // Keep input synced when URL changes (back/forward, home links, etc.)
  useEffect(() => {
    setQ(qParam)
  }, [qParam])

  const hasFilters = !!make || !!model || !!yearRaw || !!donorId || !!qParam

  const buildUrl = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || String(v).trim() === '') next.delete(k)
      else next.set(k, String(v))
    }
    const qs = next.toString()
    return qs ? `/parts?${qs}` : '/parts'
  }

  const clearAll = () => router.push('/parts')

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      // Base query (same as before)
      let query = supabase
        .from('parts')
        .select(
          // embed donor so we can filter by make/year/model and show context
          'id,donor_sled_id,title,category,condition,price,quantity,bin_location,is_listed,created_at,donor_sleds(id,make,model,year)'
        )
        .eq('is_listed', true)
        .gt('quantity', 0)
        .order('created_at', { ascending: false })
        .limit(500)

      // Filter by donor id if provided
      if (donorId) query = query.eq('donor_sled_id', donorId)

      // Filter by donor fields (requires the embedded relation)
      if (make) query = query.eq('donor_sleds.make', make)
      if (model) query = query.eq('donor_sleds.model', model)
      if (yearRaw && yearValid) query = query.eq('donor_sleds.year', Number(yearRaw))

      const { data, error } = await query

      if (!error && data) setRows(data as unknown as PartRow[])
      else setRows([])

      setLoading(false)
    }

    // If year is invalid, don't hit DB; just show none.
    if (yearRaw && !yearValid) {
      setRows([])
      setLoading(false)
      return
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [make, model, yearRaw, donorId])

  // Client-side search (keeps your original behavior)
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => {
      const donorBits = [
        r.donor_sleds?.make,
        r.donor_sleds?.model,
        r.donor_sleds?.year ? String(r.donor_sleds?.year) : null,
      ]
        .filter(Boolean)
        .join(' ')

      const blob = [r.title, r.category, r.condition, donorBits]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return blob.includes(s)
    })
  }, [q, rows])

  const onSearchChange = (v: string) => {
    setQ(v)
    // Keep URL in sync, but don’t spam router on every keystroke if you don’t want to.
    // This is still very lightweight in Next.
    router.replace(buildUrl({ q: v.trim() ? v : null }))
  }

  const pageTitle = make ? `${make} Parts` : 'Parts'

  return (
    <div className="p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">{pageTitle}</h1>
          <p className="text-sm text-gray-600 mt-1">Browse available parts (Buy Now).</p>

          {hasFilters && (
            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              {make && <Chip label={`Make: ${make}`} onClear={() => router.push(buildUrl({ make: null }))} />}
              {yearRaw && yearValid && (
                <Chip label={`Year: ${yearRaw}`} onClear={() => router.push(buildUrl({ year: null }))} />
              )}
              {model && <Chip label={`Model: ${model}`} onClear={() => router.push(buildUrl({ model: null }))} />}
              {donorId && <Chip label={`Donor: ${donorId.slice(0, 8)}…`} onClear={() => router.push(buildUrl({ donor: null }))} />}
              {qParam && <Chip label={`Search: ${qParam}`} onClear={() => router.push(buildUrl({ q: null }))} />}

              <button
                type="button"
                className="ml-1 px-3 py-1 rounded border text-xs hover:bg-gray-50"
                onClick={clearAll}
              >
                Clear all
              </button>
            </div>
          )}

          {yearRaw && !yearValid && (
            <div className="mt-3 text-xs text-red-700">Year filter is invalid.</div>
          )}
        </div>

        <input
          className="border rounded p-2 w-full max-w-lg"
          placeholder="Search parts (ECU, track, spindle, Polaris 800...)"
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {loading && <div className="mt-6 text-sm text-gray-600">Loading…</div>}

      {!loading && filtered.length === 0 && (
        <div className="mt-6 text-sm text-gray-600">No parts found.</div>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/parts/${p.id}`}
            className="border rounded-lg p-4 hover:shadow-sm transition"
          >
            <div className="text-xs text-gray-600">
              {p.category ?? '—'} • {p.condition ?? '—'}
            </div>

            <div className="mt-1 font-semibold">{p.title}</div>

            {(p.donor_sleds?.make || p.donor_sleds?.model || p.donor_sleds?.year) && (
              <div className="mt-2 text-xs text-gray-500">
                From: {[p.donor_sleds?.year, p.donor_sleds?.make, p.donor_sleds?.model].filter(Boolean).join(' ')}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <div className="text-lg font-bold">${Number(p.price).toFixed(2)}</div>
              <div className="text-xs text-gray-600">Qty {p.quantity}</div>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Listed {new Date(p.created_at).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 border">
      <span className="text-gray-800">{label}</span>
      <button
        type="button"
        className="text-gray-600 hover:text-gray-900 leading-none"
        onClick={onClear}
        aria-label={`Clear ${label}`}
        title="Remove filter"
      >
        ✕
      </button>
    </span>
  )
}
