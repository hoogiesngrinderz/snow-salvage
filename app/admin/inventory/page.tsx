'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase'

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
}

export default function AdminPartEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  // ✅ FIX: define supabase
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [p, setP] = useState<PartRow | null>(null)

  const load = async () => {
    setLoading(true)
    setMsg(null)

    const { data, error } = await supabase.from('parts').select('*').eq('id', id).single()
    if (error) {
      setMsg(`Error: ${error.message}`)
      setP(null)
      setLoading(false)
      return
    }

    setP(data as PartRow)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const update = async (patch: Partial<PartRow>, successMsg?: string) => {
    if (!p) return
    setSaving(true)
    setMsg(null)

    // optimistic
    setP({ ...p, ...patch })

    try {
      const dbPatch: any = { ...patch }

      // normalize numeric fields
      if ('price' in dbPatch) dbPatch.price = Number(dbPatch.price ?? 0)
      if ('quantity' in dbPatch) dbPatch.quantity = Number(dbPatch.quantity ?? 0)

      // if qty is 0, auto-unlist
      if ('quantity' in dbPatch) {
        const q = Number(dbPatch.quantity ?? 0)
        if (q <= 0) dbPatch.is_listed = false
      }

      const { error } = await supabase.from('parts').update(dbPatch).eq('id', id)
      if (error) throw error

      if (successMsg) setMsg(successMsg)
    } catch (e: any) {
      setMsg(`Error: ${e?.message ?? String(e)}`)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!p) return

    // basic validation
    if (!p.title?.trim()) return setMsg('Title is required.')
    if (!Number.isFinite(Number(p.price)) || Number(p.price) < 0) return setMsg('Price must be 0 or more.')
    if (!Number.isFinite(Number(p.quantity)) || Number(p.quantity) < 0) return setMsg('Quantity must be 0 or more.')

    await update(
      {
        title: p.title.trim(),
        sku: p.sku?.trim() ? p.sku.trim() : null,
        part_number: p.part_number?.trim() ? p.part_number.trim() : null,
        category: p.category?.trim() ? p.category.trim() : null,
        condition: p.condition?.trim() ? p.condition.trim() : null,
        bin_location: p.bin_location?.trim() ? p.bin_location.trim() : null,
        price: Number(p.price),
        quantity: Number(p.quantity),
        is_listed: p.quantity > 0 ? !!p.is_listed : false,
      },
      'Saved ✅'
    )
  }

  const onDelete = async () => {
    if (!confirm('Delete this part? This cannot be undone.')) return
    setSaving(true)
    setMsg(null)
    try {
      const { error } = await supabase.from('parts').delete().eq('id', id)
      if (error) throw error
      router.push('/admin/inventory')
    } catch (e: any) {
      setMsg(`Error: ${e?.message ?? String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Loading…</div>
  if (!p) return <div className="p-8">Not found.</div>

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Edit Part</h1>
          <div className="text-xs text-gray-600 mt-1">
            Created {new Date(p.created_at).toLocaleString()}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link className="border rounded px-3 py-2" href={`/admin/donor/${p.donor_sled_id}`}>
            ← Back to Donor
          </Link>
          <Link className="border rounded px-3 py-2" href={`/parts/${p.id}`}>
            Public
          </Link>
          <button className="border rounded px-3 py-2" onClick={load} disabled={saving}>
            Refresh
          </button>
          <button className="border rounded px-3 py-2 text-red-700" onClick={onDelete} disabled={saving}>
            Delete
          </button>
        </div>
      </div>

      {msg && <div className="mt-4 text-sm">{msg}</div>}

      <form onSubmit={onSave} className="mt-6 border rounded p-5 space-y-4">
        <Field label="Title *">
          <input
            className="border rounded p-2 w-full"
            value={p.title ?? ''}
            onChange={(e) => setP({ ...(p as PartRow), title: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="SKU">
            <input
              className="border rounded p-2 w-full font-mono"
              value={p.sku ?? ''}
              onChange={(e) => setP({ ...(p as PartRow), sku: e.target.value })}
            />
          </Field>

          <Field label="Part Number">
            <input
              className="border rounded p-2 w-full font-mono"
              value={p.part_number ?? ''}
              onChange={(e) => setP({ ...(p as PartRow), part_number: e.target.value })}
            />
          </Field>

          <Field label="Category">
            <input
              className="border rounded p-2 w-full"
              value={p.category ?? ''}
              onChange={(e) => setP({ ...(p as PartRow), category: e.target.value })}
            />
          </Field>

          <Field label="Condition">
            <input
              className="border rounded p-2 w-full"
              value={p.condition ?? ''}
              onChange={(e) => setP({ ...(p as PartRow), condition: e.target.value })}
            />
          </Field>

          <Field label="Bin Location">
            <input
              className="border rounded p-2 w-full"
              value={p.bin_location ?? ''}
              onChange={(e) => setP({ ...(p as PartRow), bin_location: e.target.value })}
            />
          </Field>

          <Field label="Price">
            <input
              className="border rounded p-2 w-full"
              inputMode="decimal"
              value={String(p.price ?? 0)}
              onChange={(e) => setP({ ...(p as PartRow), price: Number(e.target.value || 0) })}
            />
          </Field>

          <Field label="Quantity">
            <input
              className="border rounded p-2 w-full"
              inputMode="numeric"
              value={String(p.quantity ?? 0)}
              onChange={(e) => setP({ ...(p as PartRow), quantity: Number(e.target.value || 0) })}
            />
          </Field>

          <Field label="Listed">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!p.is_listed}
                disabled={saving || (p.quantity ?? 0) <= 0}
                onChange={(e) => setP({ ...(p as PartRow), is_listed: e.target.checked })}
              />
              <span className="text-gray-700">
                Visible on public site {((p.quantity ?? 0) <= 0) ? '(disabled when qty is 0)' : ''}
              </span>
            </label>
          </Field>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            type="submit"
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>

          <button
            type="button"
            className="border rounded px-4 py-2"
            disabled={saving}
            onClick={() => update({ is_listed: !(p.is_listed && (p.quantity ?? 0) > 0) }, p.is_listed ? 'Unlisted ✅' : 'Listed ✅')}
          >
            {p.is_listed ? 'Unlist' : 'List'}
          </button>

          <Link className="border rounded px-4 py-2" href={`/admin/parts/${p.id}/photos`}>
            Manage Photos
          </Link>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium mb-1">{label}</div>
      {children}
    </div>
  )
}
