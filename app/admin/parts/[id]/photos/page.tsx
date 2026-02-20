'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase'

type ImgRow = {
  id: string
  part_id: string
  url: string
  sort_order: number
  created_at: string
}

export default function PartPhotosPage() {
  const params = useParams<{ id: string }>()
  const partId = params.id

  // ✅ FIX: define supabase in this client component
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [rows, setRows] = useState<ImgRow[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = async () => {
    const { data, error } = await supabase
      .from('part_images')
      .select('*')
      .eq('part_id', partId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (!error && data) setRows(data as ImgRow[])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partId])

  const nextSort = useMemo(() => {
    return rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0
  }, [rows])

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    setMsg(null)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('image/')) continue

        const ext = file.name.split('.').pop() || 'jpg'
        const path = `parts/${partId}/${crypto.randomUUID()}.${ext}`

        const up = await supabase.storage.from('part-images').upload(path, file, { upsert: false })
        if (up.error) throw up.error

        const { data: pub } = supabase.storage.from('part-images').getPublicUrl(path)
        const url = pub.publicUrl

        const ins = await supabase.from('part_images').insert([
          {
            part_id: partId,
            url,
            sort_order: nextSort + i,
          },
        ])
        if (ins.error) throw ins.error
      }

      setMsg('Uploaded ✅')
      await load()
    } catch (e: any) {
      setMsg(`Error: ${e?.message ?? String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async (img: ImgRow) => {
    setBusy(true)
    setMsg(null)
    try {
      // If URL is a standard Supabase public URL, extract the storage path and delete it
      const marker = '/storage/v1/object/public/part-images/'
      const idx = img.url.indexOf(marker)
      if (idx >= 0) {
        const path = img.url.substring(idx + marker.length)
        await supabase.storage.from('part-images').remove([path])
      }

      const del = await supabase.from('part_images').delete().eq('id', img.id)
      if (del.error) throw del.error

      setMsg('Deleted ✅')
      await load()
    } catch (e: any) {
      setMsg(`Error: ${e?.message ?? String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Part Photos</h1>
          <p className="text-sm text-gray-600 mt-1">Upload photos for this listing.</p>
        </div>

        <div className="flex gap-3">
          <Link className="border rounded px-3 py-2" href="/admin/donor">
            ← Donors
          </Link>
          <Link className="border rounded px-3 py-2" href={`/parts/${partId}`}>
            View Public
          </Link>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <label className="border rounded px-4 py-2 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onUpload(e.target.files)}
            disabled={busy}
          />
          {busy ? 'Working…' : 'Upload Photos'}
        </label>

        {msg && <div className="text-sm">{msg}</div>}
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {rows.map((r) => (
          <div key={r.id} className="border rounded-lg overflow-hidden">
            <div className="aspect-square bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.url} alt="Part photo" className="w-full h-full object-cover" />
            </div>
            <div className="p-2 flex items-center justify-between text-xs">
              <span>#{r.sort_order}</span>
              <button className="underline" onClick={() => onDelete(r)} disabled={busy}>
                Delete
              </button>
            </div>
          </div>
        ))}

        {rows.length === 0 && <div className="text-sm text-gray-600">No photos yet.</div>}
      </div>
    </div>
  )
}
