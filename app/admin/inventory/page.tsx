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

type PartRow = {
  id: string
  donor_sled_id: string
  sku: string | null
  part_number: string | null
  title: string
  category: string | null
  condition: string | null
  price: number
  quantity: number
  bin_location: string | null
  is_listed: boolean
  created_at: string
  donor_sleds?: Pick<DonorSled, 'id' | 'make' | 'model' | 'year'> | null
}

export default function AdminInventoryPage() {
  // ✅ FIX: define supabase
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [donors, setDonors] = useState<DonorSled[]>([])
  const [parts, setParts] = useState<PartRow[]>([])

  const [q, setQ] = useState('')
  const [showHidden, setShowHidden] = useState(false)

  const load = async () => {
    setLoading(true)
    setErr(null)

    try {
      // 1) load donors
      const donorsRes = await supabase
        .from('donor_sleds')
        .select('id,vin,make,model,year,engine,miles,created_at')
        .order('created_at', { ascending: false })
        .limit(1000)

      if (donorsRes.error) throw donorsRes.error
      setDonors((donorsRes.data ?? []) as DonorSled[])

      // 2) load parts (include donor context)
      const partsRes = await supabase
        .from('parts')
        .select(
          'id,donor_sled_id,sku,part_number,title,category,condition,price,quantity,bin_location,is_listed,created_at,donor_sleds(id,make,model,year)'
        )
        .order('created_at', { ascending: false })
        .limit(2000)

      if (partsRes.error) throw partsRes.error
      setParts((partsRes.data ?? []) as unknown as PartRow[])
    } catch (e: any) {
      setErr(e?.message ?? String(e))
      setDonors([])
      setParts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredParts = useMemo(() => {
    const s = q.trim().toLowerCase()

    let rows = parts
    if (!showHidden) rows = rows.filter((p) => p.is_listed && p.quantity > 0)

    if (!s) return rows

    return rows.filter((p) => {
      const donorBits = [
        p.donor_sleds?.year ? String(p.donor_sleds.year) : null,
        p.donor_sleds?.make,
        p.donor_sleds?.model,
      ]
        .filter(Boolean)
        .join(' ')

      const blob = [
        p.title,
        p.category,
        p.condition,
        p.sku,
        p.part_number,
        p.bin_location,
        donorBits,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return blob.includes(s)
    })
  }, [parts, q, showHidden])

  return (
    <div className="p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-sm text-gray-600 mt-1">Donors + parts overview.</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button className="border rounded px-3 py-2" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>

          <Link className="border rounded px-3 py-2" href="/admin/donor">
            Donors
          </Link>

          <Link className="bg-black text-white rounded px-4 py-2" href="/admin/donor/new">
            + Add Donor
          </Link>
        </div>
      </div>

      {err && <div className="mt-4 text-sm text-red-700">Error: {err}</div>}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border rounded p-4">
          <div className="text-xs text-gray-600">Donors</div>
          <div className="mt-1 text-2xl font-semibold">{donors.length}</div>
        </div>

        <div className="border rounded p-4">
          <div className="text-xs text-gray-600">Parts</div>
          <div className="mt-1 text-2xl font-semibold">{parts.length}</div>
        </div>

        <div className="border rounded p-4">
          <div className="text-xs text-gray-600">Visible (listed + in stock)</div>
          <div className="mt-1 text-2xl font-semibold">
            {parts.filter((p) => p.is_listed && p.quantity > 0).length}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
        <input
          className="border rounded p-2 w-full max-w-2xl"
          placeholder="Search parts, donor make/model/year, SKU, bin…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <label className="text-sm text-gray-700 flex items-center gap-2">
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
          Show hidden / out-of-stock
        </label>
      </div>

      {loading && <div className="mt-6 text-sm text-gray-600">Loading…</div>}

      {!loading && (
        <div className="mt-6 border rounded overflow-hidden">
          <div className="grid grid-cols-12 bg-gray-50 text-sm font-medium px-3 py-2">
            <div className="col-span-5">Part</div>
            <div className="col-span-3">Donor</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-1 text-right">Open</div>
          </div>

          {filteredParts.map((p) => (
            <div key={p.id} className="grid grid-cols-12 px-3 py-3 border-t text-sm items-center">
              <div className="col-span-5 min-w-0">
                <div className="font-medium truncate">{p.title}</div>
                <div className="text-xs text-gray-600 truncate">
                  {p.category ?? '—'} • {p.condition ?? '—'} • Bin: {p.bin_location ?? '—'} • SKU:{' '}
                  <span className="font-mono">{p.sku ?? '—'}</span>
                </div>
              </div>

              <div className="col-span-3 text-xs text-gray-700 truncate">
                {[p.donor_sleds?.year, p.donor_sleds?.make, p.donor_sleds?.model].filter(Boolean).join(' ') || '—'}
              </div>

              <div className="col-span-2 font-semibold">${Number(p.price ?? 0).toFixed(2)}</div>
              <div className="col-span-1">{p.quantity ?? 0}</div>

              <div className="col-span-1 text-right">
                <Link className="underline" href={`/admin/inventory/${p.id}`}>
                  View
                </Link>
              </div>
            </div>
          ))}

          {filteredParts.length === 0 && (
            <div className="p-6 text-sm text-gray-600">No parts found.</div>
          )}
        </div>
      )}
    </div>
  )
}
