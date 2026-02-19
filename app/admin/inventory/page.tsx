'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Donor = {
  id: string
  vin: string | null
  make: string | null
  model: string | null
  year: number | null
  engine: string | null
  miles: number | null
  created_at: string
}

type DonorRow = Donor & {
  parts_total: number
  parts_listed_instock: number
}

export default function InventoryDashboardPage() {
  const [rows, setRows] = useState<DonorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setErr(null)

    // 1) load donors
    const donorsRes = await supabase
      .from('donor_sleds')
      .select('id,vin,make,model,year,engine,miles,created_at')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (donorsRes.error) {
      setErr(`donor_sleds error: ${donorsRes.error.message}`)
      setRows([])
      setLoading(false)
      return
    }

    const donors = (donorsRes.data ?? []) as Donor[]
    if (donors.length === 0) {
      setRows([])
      setLoading(false)
      return
    }

    // 2) load parts counts (just donor_sled_id, is_listed, quantity)
    const partsRes = await supabase
      .from('parts')
      .select('donor_sled_id,is_listed,quantity')
      .in('donor_sled_id', donors.map(d => d.id))
      .limit(50000)

    if (partsRes.error) {
      // still show donors even if parts query fails
      setErr(`parts error: ${partsRes.error.message}`)
      setRows(donors.map(d => ({ ...d, parts_total: 0, parts_listed_instock: 0 })))
      setLoading(false)
      return
    }

    const parts = (partsRes.data ?? []) as { donor_sled_id: string; is_listed: boolean; quantity: number }[]

    const counts = new Map<string, { total: number; listedInStock: number }>()
    for (const p of parts) {
      const cur = counts.get(p.donor_sled_id) ?? { total: 0, listedInStock: 0 }
      cur.total += 1
      if (p.is_listed && (p.quantity ?? 0) > 0) cur.listedInStock += 1
      counts.set(p.donor_sled_id, cur)
    }

    const merged: DonorRow[] = donors.map(d => {
      const c = counts.get(d.id) ?? { total: 0, listedInStock: 0 }
      return { ...d, parts_total: c.total, parts_listed_instock: c.listedInStock }
    })

    setRows(merged)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(r => {
      const blob = [r.vin, r.make, r.model, r.engine, r.year?.toString(), r.miles?.toString()]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(s)
    })
  }, [q, rows])

  return (
    <div className="p-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-sm text-gray-600 mt-1">Donor sleds + part counts. Click a donor to manage parts.</p>
        </div>

        <div className="flex gap-3">
          <button className="border rounded px-3 py-2" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <Link className="bg-black text-white rounded px-4 py-2" href="/admin/donor/new">
            + Add Donor
          </Link>
        </div>
      </div>

      {err && <div className="mt-4 text-sm text-red-700">⚠ {err}</div>}

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <input
          className="border rounded p-2 w-full max-w-xl"
          placeholder="Search VIN, make, model, year, engine…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-sm text-gray-600">{filtered.length} / {rows.length}</span>
      </div>

      <div className="mt-6 border rounded overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 text-sm font-medium px-3 py-2">
          <div className="col-span-4">Donor</div>
          <div className="col-span-2">VIN</div>
          <div className="col-span-2">Engine</div>
          <div className="col-span-2">Parts</div>
          <div className="col-span-2 text-right">Manage</div>
        </div>

        {filtered.map(r => (
          <div key={r.id} className="grid grid-cols-12 px-3 py-3 border-t text-sm items-center">
            <div className="col-span-4">
              <div className="font-medium">{r.year ?? '—'} {r.make ?? ''} {r.model ?? ''}</div>
              <div className="text-xs text-gray-600">Added {new Date(r.created_at).toLocaleString()} • Miles {r.miles ?? '—'}</div>
            </div>

            <div className="col-span-2 truncate font-mono text-xs" title={r.vin ?? ''}>
              {r.vin ?? '—'}
            </div>

            <div className="col-span-2">{r.engine ?? '—'}</div>

            <div className="col-span-2">
              <div className="font-medium">{r.parts_total}</div>
              <div className="text-xs text-gray-600">{r.parts_listed_instock} listed/in stock</div>
            </div>

            <div className="col-span-2 text-right">
              <Link className="underline" href={`/admin/donor/${r.id}`}>Open</Link>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="p-6 text-sm text-gray-600">No donors found.</div>
        )}
      </div>
    </div>
  )
}
