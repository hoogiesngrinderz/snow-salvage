'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase'

type DonorSled = {
  id: string
  vin: string | null
  make: string | null
  model: string | null
  year: number | null
  engine: string | null
  miles: number | null
  created_at: string
}

export default function DonorListPage() {
  // ✅ FIX: define supabase for this page
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [rows, setRows] = useState<DonorSled[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setErr(null)

    const { data, error } = await supabase
      .from('donor_sleds')
      .select('id,vin,make,model,year,engine,miles,created_at')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      setErr(error.message)
      setRows([])
    } else {
      setRows((data ?? []) as DonorSled[])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => {
      const blob = [r.vin, r.make, r.model, r.engine, r.year?.toString(), r.miles?.toString()]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(s)
    })
  }, [q, rows])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Donor Sleds</h1>
          <p className="text-sm text-gray-600 mt-1">Open a donor to add/manage parts.</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button className="border rounded px-3 py-2" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>

          <Link className="bg-black text-white rounded px-4 py-2" href="/admin/donor/new">
            + Add Donor
          </Link>

          <Link className="border rounded px-4 py-2" href="/admin/inventory">
            Inventory
          </Link>
        </div>
      </div>

      {err && <div className="mt-4 text-sm text-red-700">Error: {err}</div>}

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <input
          className="border rounded p-2 w-full max-w-xl"
          placeholder="Search VIN, make, model, year, engine…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-sm text-gray-600">
          {filtered.length} / {rows.length}
        </span>
      </div>

      <div className="mt-6 border rounded overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 text-sm font-medium px-3 py-2">
          <div className="col-span-4">Donor</div>
          <div className="col-span-3">VIN</div>
          <div className="col-span-2">Engine</div>
          <div className="col-span-2">Miles</div>
          <div className="col-span-1 text-right">Open</div>
        </div>

        {filtered.map((r) => (
          <div key={r.id} className="grid grid-cols-12 px-3 py-3 border-t text-sm items-center">
            <div className="col-span-4">
              <div className="font-medium">
                {r.year ?? '—'} {r.make ?? ''} {r.model ?? ''}
              </div>
              <div className="text-xs text-gray-600">Added {new Date(r.created_at).toLocaleString()}</div>
            </div>

            <div className="col-span-3 truncate font-mono text-xs" title={r.vin ?? ''}>
              {r.vin ?? '—'}
            </div>

            <div className="col-span-2">{r.engine ?? '—'}</div>
            <div className="col-span-2">{typeof r.miles === 'number' ? r.miles.toLocaleString() : '—'}</div>

            <div className="col-span-1 text-right">
              <Link className="underline" href={`/admin/donor/${r.id}`}>
                View
              </Link>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && <div className="p-6 text-sm text-gray-600">No donors found.</div>}
      </div>
    </div>
  )
}
