'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewDonorSledPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [vin, setVin] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [engine, setEngine] = useState('')
  const [miles, setMiles] = useState('')
  const [notes, setNotes] = useState('')

  // photos
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  useEffect(() => {
    return () => {
      photoPreviews.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [photoPreviews])

  const onPickPhotos = (files: FileList | null) => {
    if (!files) return
    photoPreviews.forEach((u) => URL.revokeObjectURL(u))

    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'))
    setPhotoFiles(imgs)
    setPhotoPreviews(imgs.map(f => URL.createObjectURL(f)))
  }

  const removePhotoAt = (idx: number) => {
    const u = photoPreviews[idx]
    if (u) URL.revokeObjectURL(u)

    setPhotoFiles(photoFiles.filter((_, i) => i !== idx))
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== idx))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    try {
      // 1️⃣ Insert donor
      const { data: donor, error: donorErr } = await supabase
        .from('donor_sleds')
        .insert([{
          vin: vin.trim() || null,
          make: make.trim() || null,
          model: model.trim() || null,
          year: year ? Number(year) : null,
          engine: engine.trim() || null,
          miles: miles ? Number(miles) : null,
          notes: notes.trim() || null,
        }])
        .select('id')
        .single()

      if (donorErr) throw donorErr
      const donorId = donor.id as string

      // 2️⃣ Upload photos + set cover_url
      let coverUrl: string | null = null

      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i]
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `donors/${donorId}/${donorId}-${String(i + 1).padStart(2, '0')}.${ext}`

        const up = await supabase.storage
          .from('donor-images')
          .upload(path, file, { upsert: true })

        if (up.error) throw up.error

        const { data: pub } = supabase.storage
          .from('donor-images')
          .getPublicUrl(path)

        const url = pub.publicUrl
        if (!coverUrl) coverUrl = url

        const { error: imgErr } = await supabase
          .from('donor_images')
          .insert([{
            donor_sled_id: donorId,
            url,
            sort_order: i,
          }])

        if (imgErr) throw imgErr
      }

      // 3️⃣ Save cover_url
      if (coverUrl) {
        const { error: coverErr } = await supabase
          .from('donor_sleds')
          .update({ cover_url: coverUrl })
          .eq('id', donorId)

        if (coverErr) throw coverErr
      }

      // 4️⃣ Redirect
      router.push(`/admin/donor/${donorId}`)

    } catch (err: any) {
      setMsg(`Error: ${err?.message ?? String(err)}`)
      setLoading(false)
      return
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold">Add Donor Sled</h1>
      <p className="text-sm text-gray-600 mt-1">
        Create a donor sled record before adding parts.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="VIN" value={vin} onChange={setVin} />
          <Field label="Year" value={year} onChange={setYear} />
          <Field label="Make" value={make} onChange={setMake} />
          <Field label="Model" value={model} onChange={setModel} />
          <Field label="Engine" value={engine} onChange={setEngine} />
          <Field label="Miles" value={miles} onChange={setMiles} />
        </div>

        {/* Photos */}
        <div className="border rounded p-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium text-sm">Donor Photos</div>
              <div className="text-xs text-gray-600">First photo becomes thumbnail</div>
            </div>

            <label className="border rounded px-3 py-2 text-sm cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                hidden
                disabled={loading}
                onChange={(e) => onPickPhotos(e.target.files)}
              />
              Choose Photos
            </label>
          </div>

          {photoPreviews.length > 0 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {photoPreviews.map((src, i) => (
                <div key={src} className="relative aspect-square border rounded overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} className="object-cover w-full h-full" alt="" />
                  <button
                    type="button"
                    onClick={() => removePhotoAt(i)}
                    className="absolute top-1 right-1 bg-white border rounded text-xs px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-xs text-gray-500">No photos selected.</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            className="border rounded p-2 w-full min-h-[100px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
        >
          {loading ? 'Saving…' : 'Save Donor Sled'}
        </button>

        {msg && <div className="text-sm mt-2">{msg}</div>}
      </form>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        className="border rounded p-2 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
