'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase'

type Part = {
  id: string
  donor_sled_id: string | null
  title: string
  category: string | null
  condition: string | null
  price: number
  quantity: number
  bin_location: string | null
  is_listed: boolean | null
  created_at: string
  updated_at?: string | null
  sku?: string | null
  part_number?: string | null
}

export default function InventoryPartPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  // ✅ FIX: define supabase
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [p, setP] = useState<Part | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setMsg(null)

    const { data, error } = await supabase.from('parts').select('*').eq('id', id).single()

    if (error) {
      setP(null)
      setMsg(error.message)
    } else {
      setP(data as Part)
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <div className="p-8">Loading…</div>

  if (!p) {
    return (
      <div className="p-8">
        <Link href="/admin/inventory" className="underline">
          ← Back
        </Link>
        <div className="mt-4 text-sm text-red-700">{msg ?? 'Not found.'}</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{p.title}</h1>
          <div className="text-xs text-gray-600 mt-1">
            {p.category ?? '—'} • {p.condition ?? '—'}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Link className="border rounded px-3 py-2" href="/admin/inventory">
            ← Back
          </Link>
          <button className="border rounded px-3 py-2" onClick={load}>
            Refresh
          </button>
          <Link className="border rounded px-3 py-2" href={`/admin/parts/${p.id}`}>
            Edit
          </Link>
        </div>
      </div>

      {msg && <div className="mt-4 text-sm text-red-700">{msg}</div>}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card label="Price" value={`$${Number(p.price ?? 0).toFixed(2)}`} />
        <Card label="Quantity" value={`${p.quantity ?? 0}`} />
        <Card label="Bin" value={p.bin_location ?? '—'} />
        <Card label="Listed" value={p.is_listed ? 'Yes' : 'No'} />
        <Card label="SKU" value={p.sku ?? '—'} />
        <Card label="Part Number" value={p.part_number ?? '—'} />
      </div>

      <div className="mt-6 text-xs text-gray-600">
        Created {new Date(p.created_at).toLocaleString()}
        {p.updated_at ? ` • Updated ${new Date(p.updated_at).toLocaleString()}` : null}
      </div>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded p-4">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  )
}
