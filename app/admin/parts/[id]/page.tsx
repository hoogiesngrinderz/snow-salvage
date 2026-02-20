'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase'


type Part = {
  id: string
  donor_sled_id: string
  title: string
  sku: string | null
  part_number: string | null
  category: string | null
  condition: string | null
  price: number
  cost: number | null
  quantity: number
  bin_location: string | null
  is_listed: boolean
  description: string | null
}

export default function EditPartPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

    // ✅ FIX: define supabase
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [p, setP] = useState<Part | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setMsg(null)
    const { data, error } = await supabase.from('parts').select('*').eq('id', id).single()
    if (error) {
      setMsg(`Error: ${error.message}`)
      setP(null)
    } else {
      setP(data as Part)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  const save = async () => {
    if (!p) return
    setSaving(true)
    setMsg(null)

    const { error } = await supabase
      .from('parts')
      .update({
        title: p.title,
        sku: p.sku,
        part_number: p.part_number,
        category: p.category,
        condition: p.condition,
        price: Number(p.price || 0),
        cost: p.cost === null ? null : Number(p.cost),
        quantity: Number(p.quantity || 0),
        bin_location: p.bin_location,
        is_listed: p.is_listed,
        description: p.description,
      })
      .eq('id', id)

    setSaving(false)
    setMsg(error ? `Error: ${error.message}` : 'Saved ✅')
  }

  const del = async () => {
    if (!p) return
    const ok = confirm('Delete this part? This cannot be undone.')
    if (!ok) return

    const { error } = await supabase.from('parts').delete().eq('id', id)
    if (error) {
      setMsg(`Error: ${error.message}`)
      return
    }
    window.location.href = `/admin/donor/${p.donor_sled_id}`
  }

  if (loading) return <div className="p-8">Loading…</div>

  if (!p) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Edit Part</h1>
        <div className="mt-3 text-sm text-red-700">{msg ?? 'Not found.'}</div>
        <div className="mt-4">
          <Link className="underline" href="/admin/donor">← Back</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Edit Part</h1>
          <div className="text-xs text-gray-600 font-mono mt-1">{p.id}</div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link className="border rounded px-3 py-2" href={`/admin/donor/${p.donor_sled_id}`}>← Back</Link>
          <Link className="border rounded px-3 py-2" href={`/admin/parts/${p.id}/photos`}>Photos</Link>
          <Link className="border rounded px-3 py-2" href={`/parts/${p.id}`}>Public</Link>
        </div>
      </div>

      {msg && <div className="mt-4 text-sm">{msg}</div>}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Title" value={p.title} onChange={(v) => setP({ ...p, title: v })} />
        <Field label="SKU" value={p.sku ?? ''} onChange={(v) => setP({ ...p, sku: v || null })} />
        <Field label="Part Number" value={p.part_number ?? ''} onChange={(v) => setP({ ...p, part_number: v || null })} />
        <Field label="Category" value={p.category ?? ''} onChange={(v) => setP({ ...p, category: v || null })} />
        <Field label="Condition" value={p.condition ?? ''} onChange={(v) => setP({ ...p, condition: v || null })} />
        <Field label="Bin" value={p.bin_location ?? ''} onChange={(v) => setP({ ...p, bin_location: v || null })} />
        <Field label="Price" value={String(p.price)} onChange={(v) => setP({ ...p, price: Number(v || 0) })} />
        <Field label="Qty" value={String(p.quantity)} onChange={(v) => setP({ ...p, quantity: Number(v || 0) })} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm font-medium">Listed</label>
        <input
          type="checkbox"
          checked={p.is_listed}
          onChange={(e) => setP({ ...p, is_listed: e.target.checked })}
        />
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          className="border rounded p-2 w-full min-h-[140px]"
          value={p.description ?? ''}
          onChange={(e) => setP({ ...p, description: e.target.value || null })}
        />
      </div>

      <div className="mt-6 flex gap-3 flex-wrap">
        <button className="bg-black text-white rounded px-4 py-2 disabled:opacity-60" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="border rounded px-4 py-2 text-red-700" onClick={del} disabled={saving}>
          Delete
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input className="border rounded p-2 w-full" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
