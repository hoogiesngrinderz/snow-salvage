'use client'

/**
 * DROP-IN FILE
 * Save as: app/donor/[id]/parts.tsx
 *
 * Uses browser client only:
 * - getSupabaseBrowserClient() from '@/lib/supabase'
 *
 * Notes:
 * - Fixes the build error by NOT using `await` directly inside `useEffect`.
 * - Avoids “excessively deep” TS errors by NOT dynamically querying unknown tables/columns.
 * - Loads donor cover photo from `donor_images` where `donor_sled_id = donorId`
 *   and supports either:
 *     - donor_images.url (public URL), or
 *     - donor_images.path (storage path in bucket `donor-images`, public or signed)
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase'

type DonorSled = {
  id: string
  vin: string | null
  make: string | null
  model: string | null
  year: number | null
  engine: string | null
  miles: number | null
  notes: string | null
  created_at: string
}

type PartRow = {
  id: string
  donor_sled_id: string
  title: string
  category: string | null
  condition: string | null
  price: number
  quantity: number
  created_at: string
}

type DonorImageRow = {
  url: string | null
  path: string | null
  sort_order: number | null
  created_at: string
}

export default function PublicDonorPartsPage() {
  const params = useParams<{ id: string }>()
  const donorId = params.id

  const [donor, setDonor] = useState<DonorSled | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const [parts, setParts] = useState<PartRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'new' | 'price_asc' | 'price_desc'>('new')

  const loadDonorPhoto = async (supabase: ReturnType<typeof getSupabaseBrowserClient>) => {
    const res = await supabase
      .from('donor_images')
      .select('url, path, sort_order, created_at')
      .eq('donor_sled_id', donorId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1)

    if (res.error) return null
    const row = (res.data?.[0] ?? null) as DonorImageRow | null
    if (!row) return null

    if (row.url && row.url.trim()) return row.url.trim()

    if (row.path && row.path.trim()) {
      const path = row.path.trim()

      // public url (public bucket)
      try {
        const { data: pub } = supabase.storage.from('donor-images').getPublicUrl(path)
        if (pub?.publicUrl) return pub.publicUrl
      } catch {}

      // signed url (private bucket)
      try {
        const { data: signed, error: signErr } = await supabase.storage
          .from('donor-images')
          .createSignedUrl(path, 60 * 60) // 1 hour
        if (!signErr && signed?.signedUrl) return signed.signedUrl
      } catch {}
    }

    return null
  }

  const load = async (supabase: ReturnType<typeof getSupabaseBrowserClient>) => {
    setLoading(true)
    setMsg(null)

    // donor
    const donorRes = await supabase
      .from('donor_sleds')
      .select('*')
      .eq('id', donorId)
      .single()

    if (donorRes.error) {
      setDonor(null)
      setParts([])
      setPhotoUrl(null)
      setMsg('Not found.')
      setLoading(false)
      return
    }

    setDonor(donorRes.data as DonorSled)

    // photo
    const url = await loadDonorPhoto(supabase)
    setPhotoUrl(url)

    // parts: ONLY listed + in stock
    const partsRes = await supabase
      .from('parts')
      .select('id,donor_sled_id,title,category,condition,price,quantity,created_at')
      .eq('donor_sled_id', donorId)
      .eq('is_listed', true)
      .gt('quantity', 0)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (partsRes.error) {
      setParts([])
      setMsg(`Error loading parts: ${partsRes.error.message}`)
      setLoading(false)
      return
    }

    setParts((partsRes.data ?? []) as PartRow[])
    setLoading(false)
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const run = async () => {
      await load(supabase)
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donorId])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    let rows = parts

    if (s) {
      rows = rows.filter((p) => {
        const blob = [p.title, p.category, p.condition].filter(Boolean).join(' ').toLowerCase()
        return blob.includes(s)
      })
    }

    if (sort === 'price_asc') rows = [...rows].sort((a, b) => Number(a.price) - Number(b.price))
    if (sort === 'price_desc') rows = [...rows].sort((a, b) => Number(b.price) - Number(a.price))
    if (sort === 'new') rows = [...rows].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))

    return rows
  }, [parts, q, sort])

  const subtitle = useMemo(() => {
    if (!donor) return ''
    const y = donor.year ?? '—'
    const mk = donor.make ?? ''
    const md = donor.model ?? ''
    return `${y} ${mk} ${md}`.trim()
  }, [donor])

  if (loading) return <div className="p-8">Loading…</div>

  if (!donor) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-700 hover:underline">
          ← Back
        </Link>
        <div className="mt-6 border rounded-lg p-6 bg-white">
          <div className="text-xl font-semibold">Not found</div>
          <div className="text-sm text-gray-600 mt-1">{msg ?? 'This donor sled does not exist.'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-700 hover:underline">
            ← Back to inventory
          </Link>

          <h1 className="mt-3 text-3xl font-bold">{subtitle || 'Donor Sled'}</h1>

          <div className="mt-2 text-sm text-gray-600 flex gap-3 flex-wrap">
            <span>
              VIN: <span className="font-mono">{donor.vin ?? '—'}</span>
            </span>
            <span>•</span>
            <span>Engine: {donor.engine ?? '—'}</span>
            <span>•</span>
            <span>Miles: {typeof donor.miles === 'number' ? donor.miles.toLocaleString() : '—'}</span>
          </div>

          {donor.notes ? (
            <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap max-w-2xl">{donor.notes}</div>
          ) : null}
        </div>

        <div className="w-full sm:w-[360px]">
          <div className="border rounded-xl overflow-hidden bg-white">
            <div className="aspect-[16/10] bg-gray-100">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt="Donor sled photo"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setPhotoUrl(null)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-600">
                  No photo
                </div>
              )}
            </div>
            <div className="p-3 text-xs text-gray-600 flex items-center justify-between">
              <span>{parts.length} parts in stock</span>
              <button
                className="underline hover:text-gray-900"
                onClick={() => {
                  const supabase = getSupabaseBrowserClient()
                  load(supabase)
                }}
                title="Refresh"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {msg && <div className="mt-4 text-sm text-red-700">{msg}</div>}

      <div className="mt-8 border rounded-xl bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-semibold">Available Parts</div>
            <div className="text-xs text-gray-600">Listed + in stock only</div>
          </div>

          <div className="flex gap-3 flex-wrap w-full sm:w-auto">
            <input
              className="border rounded px-3 py-2 text-sm w-full sm:w-[320px]"
              placeholder="Search parts (ECU, track, spindle...)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <select
              className="border rounded px-3 py-2 text-sm bg-white"
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
            >
              <option value="new">Newest</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">No parts found{q.trim() ? ' for that search.' : '.'}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filtered.map((p) => (
              <Link
                key={p.id}
                href={`/parts/${p.id}`}
                className="border rounded-lg p-4 hover:shadow-sm transition"
                title="Open part"
              >
                <div className="text-xs text-gray-600">
                  {p.category ?? '—'} • {p.condition ?? '—'}
                </div>

                <div className="mt-1 font-semibold">{p.title}</div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-lg font-bold">${Number(p.price).toFixed(2)}</div>
                  <div className="text-xs text-gray-600">Qty {p.quantity}</div>
                </div>

                <div className="mt-2 text-xs text-gray-500">Listed {new Date(p.created_at).toLocaleDateString()}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
