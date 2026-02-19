'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

type DonorImage = {
  id: string
  donor_sled_id: string
  url: string
  sort_order: number
  created_at: string
}

type ConfirmModalState = null | {
  title: string
  body: string
  actionLabel: string
  danger?: boolean
  onConfirm: () => Promise<void>
}

export default function DonorDetailPage() {
  const params = useParams<{ id: string }>()
  const donorId = params.id

  const [donor, setDonor] = useState<DonorSled | null>(null)
  const [parts, setParts] = useState<PartRow[]>([])
  const [donorImages, setDonorImages] = useState<DonorImage[]>([])

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // Parts list filters
  const [showHidden, setShowHidden] = useState(false)

  // Add Part form
  const [title, setTitle] = useState('')
  const [sku, setSku] = useState('')
  const [partNumber, setPartNumber] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('Used')
  const [price, setPrice] = useState('0')
  const [quantity, setQuantity] = useState('1')
  const [bin, setBin] = useState('')
  const [listed, setListed] = useState(true)

  // Part photos selected before save
  const [partPhotoFiles, setPartPhotoFiles] = useState<File[]>([])
  const [partPhotoPreviews, setPartPhotoPreviews] = useState<string[]>([])

  // Donor photos selected before upload
  const [donorPhotoFiles, setDonorPhotoFiles] = useState<File[]>([])
  const [donorPhotoPreviews, setDonorPhotoPreviews] = useState<string[]>([])

  // Delete modal
  const [modal, setModal] = useState<ConfirmModalState>(null)

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setMsg(null)

    const donorRes = await supabase
      .from('donor_sleds')
      .select('*')
      .eq('id', donorId)
      .single()

    if (!donorRes.error) setDonor(donorRes.data as DonorSled)

    const partsRes = await supabase
      .from('parts')
      .select('*')
      .eq('donor_sled_id', donorId)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (!partsRes.error && partsRes.data) setParts(partsRes.data as PartRow[])

    const imgRes = await supabase
      .from('donor_images')
      .select('*')
      .eq('donor_sled_id', donorId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(200)

    if (!imgRes.error && imgRes.data) setDonorImages(imgRes.data as DonorImage[])

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donorId])

  // cleanup previews on unmount
  useEffect(() => {
    return () => {
      partPhotoPreviews.forEach((u) => URL.revokeObjectURL(u))
      donorPhotoPreviews.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [partPhotoPreviews, donorPhotoPreviews])

  const normalizeListing = (qty: number, isListed: boolean) => (qty <= 0 ? false : isListed)

  const updatePart = async (partId: string, patch: Partial<PartRow>, successMsg?: string) => {
    setMsg(null)
    setBusy(true)

    setParts(prev => prev.map(p => (p.id === partId ? { ...p, ...patch } : p)))

    try {
      const dbPatch: any = {}
      if ('price' in patch) dbPatch.price = Number((patch.price as any) ?? 0)
      if ('quantity' in patch) dbPatch.quantity = Number((patch.quantity as any) ?? 0)
      if ('bin_location' in patch) dbPatch.bin_location = patch.bin_location
      if ('is_listed' in patch) dbPatch.is_listed = patch.is_listed

      const { error } = await supabase.from('parts').update(dbPatch).eq('id', partId)
      if (error) throw error

      if (successMsg) setMsg(successMsg)
    } catch (e: any) {
      setMsg(`Error: ${e?.message ?? String(e)}`)
      await load()
    } finally {
      setBusy(false)
    }
  }

  // ---------- Part photo picker ----------
  const onPickPartPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return
    partPhotoPreviews.forEach((u) => URL.revokeObjectURL(u))

    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    setPartPhotoFiles(arr)
    setPartPhotoPreviews(arr.map(f => URL.createObjectURL(f)))
  }

  const removePartPhotoAt = (idx: number) => {
    const removed = partPhotoPreviews[idx]
    if (removed) URL.revokeObjectURL(removed)
    setPartPhotoFiles(partPhotoFiles.filter((_, i) => i !== idx))
    setPartPhotoPreviews(partPhotoPreviews.filter((_, i) => i !== idx))
  }

  // ---------- Donor photo picker ----------
  const onPickDonorPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return
    donorPhotoPreviews.forEach((u) => URL.revokeObjectURL(u))

    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    setDonorPhotoFiles(arr)
    setDonorPhotoPreviews(arr.map(f => URL.createObjectURL(f)))
  }

  const removeDonorPhotoAt = (idx: number) => {
    const removed = donorPhotoPreviews[idx]
    if (removed) URL.revokeObjectURL(removed)
    setDonorPhotoFiles(donorPhotoFiles.filter((_, i) => i !== idx))
    setDonorPhotoPreviews(donorPhotoPreviews.filter((_, i) => i !== idx))
  }

  const uploadDonorPhotos = async () => {
    if (donorPhotoFiles.length === 0) {
      setMsg('Select donor photos first.')
      return
    }

    setBusy(true)
    setMsg(null)

    try {
      // next sort index
      const base = donorImages.length ? Math.max(...donorImages.map(i => i.sort_order ?? 0)) + 1 : 0

      for (let i = 0; i < donorPhotoFiles.length; i++) {
        const file = donorPhotoFiles[i]
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `donors/${donorId}/${donorId}-${Date.now()}-${String(i + 1).padStart(2, '0')}.${ext}`

        const up = await supabase.storage.from('donor-images').upload(path, file, { upsert: true })
        if (up.error) throw up.error

        const { data: pub } = supabase.storage.from('donor-images').getPublicUrl(path)
        const url = pub.publicUrl

        const ins = await supabase.from('donor_images').insert([{
          donor_sled_id: donorId,
          url,
          sort_order: base + i,
        }])

        if (ins.error) throw ins.error
      }

      // clear picker
      donorPhotoPreviews.forEach((u) => URL.revokeObjectURL(u))
      setDonorPhotoFiles([])
      setDonorPhotoPreviews([])

      setMsg('Donor photos uploaded ✅')
      await load()
    } catch (e: any) {
      setMsg(`Error: ${e?.message ?? String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const deleteDonorImage = async (img: DonorImage) => {
    setModal({
      title: 'Delete donor photo?',
      body: 'This removes the photo record. (Storage cleanup can be added next.)',
      actionLabel: 'DELETE',
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase.from('donor_images').delete().eq('id', img.id)
        if (error) throw error
        setMsg('Photo deleted ✅')
        await load()
      },
    })
  }

  // ---------- Add Part ----------
  const onAddPart = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    const t = title.trim()
    if (!t) return setMsg('Title is required.')

    const qty = Number(quantity || 0)
    if (Number.isNaN(qty) || qty < 0) return setMsg('Quantity must be 0 or more.')

    setBusy(true)
    try {
      const payload = {
        donor_sled_id: donorId,
        title: t,
        sku: sku.trim() || null,
        part_number: partNumber.trim() || null,
        category: category.trim() || null,
        condition: condition.trim() || null,
        price: Number(price || 0),
        quantity: qty,
        bin_location: bin.trim() || null,
        is_listed: normalizeListing(qty, listed),
      }

      const partInsert = await supabase
        .from('parts')
        .insert([payload])
        .select('id')
        .single()

      if (partInsert.error) throw partInsert.error

      const partId = partInsert.data.id as string

      // Upload part photos
      if (partPhotoFiles.length > 0) {
        for (let i = 0; i < partPhotoFiles.length; i++) {
          const file = partPhotoFiles[i]
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
          const path = `parts/${partId}/${partId}-${String(i + 1).padStart(2, '0')}.${ext}`

          const up = await supabase.storage.from('part-images').upload(path, file, { upsert: true })
          if (up.error) throw up.error

          const { data: pub } = supabase.storage.from('part-images').getPublicUrl(path)
          const url = pub.publicUrl

          const insImg = await supabase.from('part_images').insert([{
            part_id: partId,
            url,
            sort_order: i,
          }])

          if (insImg.error) throw insImg.error
        }
      }

      // reset part form
      setTitle('')
      setSku('')
      setPartNumber('')
      setCategory('')
      setCondition('Used')
      setPrice('0')
      setQuantity('1')
      setBin('')
      setListed(true)

      partPhotoPreviews.forEach((u) => URL.revokeObjectURL(u))
      setPartPhotoFiles([])
      setPartPhotoPreviews([])

      setMsg(qty <= 0 ? 'Saved ✅ (auto-hidden because Qty is 0)' : 'Part + photos saved ✅')
      await load()
    } catch (err: any) {
      setMsg(`Error: ${err?.message ?? String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  // ---------- Actions ----------
  const toggleList = async (p: PartRow) => {
    if (busy) return
    if (p.quantity <= 0 && !p.is_listed) {
      setMsg('Cannot list: quantity is 0. Increase quantity first.')
      return
    }
    await updatePart(p.id, { is_listed: !p.is_listed }, !p.is_listed ? 'Listed ✅' : 'Unlisted ✅')
  }

  const setQty = async (p: PartRow, qty: number) => {
    if (busy) return
    const nextListed = normalizeListing(qty, p.is_listed)
    await updatePart(p.id, { quantity: qty, is_listed: nextListed }, qty <= 0 ? 'Qty set to 0 ✅ (auto-hidden)' : 'Qty updated ✅')
  }

  const soldOut = async (p: PartRow) => {
    if (busy) return
    await updatePart(p.id, { quantity: 0, is_listed: false }, 'Marked sold out ✅ (qty 0, unlisted)')
  }

  const openDeleteDonor = () => {
    setModal({
      title: 'Delete donor sled?',
      body: 'This will permanently delete this donor AND all associated parts and images.',
      actionLabel: 'DELETE',
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase.from('donor_sleds').delete().eq('id', donorId)
        if (error) throw error
        window.location.href = '/admin/donor'
      },
    })
  }

  const openDeletePart = (p: PartRow) => {
    setModal({
      title: 'Delete part?',
      body: `This will permanently delete:\n\n${p.title}\n\nThis cannot be undone.`,
      actionLabel: 'DELETE',
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase.from('parts').delete().eq('id', p.id)
        if (error) throw error
        setMsg('Part deleted ✅')
        await load()
      },
    })
  }

  const totalParts = parts.length
  const listedInStock = parts.filter(p => p.is_listed && p.quantity > 0).length
  const outOfStock = parts.filter(p => p.quantity <= 0).length

  const visibleParts = useMemo(() => {
    if (showHidden) return parts
    return parts.filter(p => p.is_listed && p.quantity > 0)
  }, [parts, showHidden])

  if (loading) return <div className="p-8">Loading…</div>
  if (!donor) return <div className="p-8">Not found.</div>

  return (
    <div className="p-8">
      {modal && (
        <ConfirmModal
          title={modal.title}
          body={modal.body}
          actionLabel={modal.actionLabel}
          danger={modal.danger}
          onClose={() => setModal(null)}
          onConfirm={async () => {
            try {
              await modal.onConfirm()
            } catch (e: any) {
              setMsg(`Error: ${e?.message ?? String(e)}`)
            } finally {
              setModal(null)
            }
          }}
        />
      )}

      {lightboxUrl && (
        <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">
            {donor.year ?? '—'} {donor.make ?? ''} {donor.model ?? ''}
          </h1>
          <div className="text-sm text-gray-600 mt-1">
            VIN: <span className="font-mono">{donor.vin ?? '—'}</span>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Link className="border rounded px-3 py-2" href="/admin/donor">← Back</Link>
          <button onClick={load} className="border rounded px-3 py-2" disabled={busy}>Refresh</button>
          <button onClick={openDeleteDonor} className="border rounded px-3 py-2 text-red-700" disabled={busy}>
            Delete Donor
          </button>
        </div>
      </div>

      {msg && <div className="mt-4 text-sm">{msg}</div>}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card label="Engine" value={donor.engine ?? '—'} />
        <Card label="Miles" value={donor.miles?.toString() ?? '—'} />
        <Card label="Parts" value={`${totalParts}`} />
        <Card label="Listed/In stock" value={`${listedInStock}`} />
      </div>

      <div className="mt-4 text-xs text-gray-600">
        Out of stock: <span className="font-medium">{outOfStock}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Donor photos */}
          <div className="border rounded p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold">Donor Photos</h2>
                <div className="text-xs text-gray-600 mt-1">
                  Click a photo to zoom. Upload adds to the end.
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <label className="border rounded px-3 py-2 cursor-pointer text-sm">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onPickDonorPhotos(e.target.files)}
                    disabled={busy}
                  />
                  Choose Photos
                </label>

                <button
                  className="bg-black text-white rounded px-3 py-2 text-sm disabled:opacity-60"
                  type="button"
                  onClick={uploadDonorPhotos}
                  disabled={busy || donorPhotoFiles.length === 0}
                >
                  Upload
                </button>
              </div>
            </div>

            {donorPhotoPreviews.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-gray-600">Ready to upload:</div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {donorPhotoPreviews.map((src, idx) => (
                    <div key={src} className="relative border rounded overflow-hidden aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeDonorPhotoAt(idx)}
                        className="absolute top-1 right-1 bg-white/90 border rounded px-2 py-0.5 text-xs"
                        disabled={busy}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {donorImages.length > 0 ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {donorImages.map((img) => (
                  <div key={img.id} className="relative border rounded overflow-hidden aspect-square group">
                    <button
                      type="button"
                      className="w-full h-full"
                      onClick={() => setLightboxUrl(img.url)}
                      title="Click to zoom"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="donor" className="w-full h-full object-cover" />
                    </button>

                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-white/95 border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition"
                      onClick={() => deleteDonorImage(img)}
                      disabled={busy}
                      title="Delete photo"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-sm text-gray-600">No donor photos yet.</div>
            )}
          </div>

          {/* Add part + photos */}
          <div className="border rounded p-5">
            <h2 className="text-xl font-semibold">Add Part</h2>

            <form onSubmit={onAddPart} className="mt-4 space-y-4">
              <Field label="Title *" value={title} onChange={setTitle} placeholder="2019 Polaris RMK 800 ECU / CDI" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="SKU" value={sku} onChange={setSku} placeholder="Optional (unique)" />
                <Field label="Part Number" value={partNumber} onChange={setPartNumber} placeholder="Optional" />
                <Field label="Category" value={category} onChange={setCategory} placeholder="Engine / Suspension / Electrical…" />
                <Field label="Condition" value={condition} onChange={setCondition} placeholder="Used / New / Core" />
                <Field label="Price" value={price} onChange={setPrice} placeholder="e.g., 249.99" />
                <Field label="Quantity" value={quantity} onChange={setQuantity} placeholder="e.g., 1" />
                <Field label="Bin Location" value={bin} onChange={setBin} placeholder="A3-14" />

                <div className="flex items-end gap-2">
                  <label className="text-sm font-medium">Listed</label>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={listed}
                    onChange={(e) => setListed(e.target.checked)}
                    disabled={Number(quantity || 0) <= 0}
                    title={Number(quantity || 0) <= 0 ? 'Auto-hidden when Qty is 0' : ''}
                  />
                </div>
              </div>

              {/* Part photos picker */}
              <div className="border rounded p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-medium">Part Photos</div>
                    <div className="text-xs text-gray-600">
                      Choose photos now — they upload after you save the part.
                    </div>
                  </div>

                  <label className="border rounded px-3 py-2 cursor-pointer text-sm">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => onPickPartPhotos(e.target.files)}
                      disabled={busy}
                    />
                    Choose Photos
                  </label>
                </div>

                {partPhotoPreviews.length > 0 ? (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {partPhotoPreviews.map((src, idx) => (
                      <div key={src} className="relative border rounded overflow-hidden aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePartPhotoAt(idx)}
                          className="absolute top-1 right-1 bg-white/90 border rounded px-2 py-0.5 text-xs"
                          disabled={busy}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-gray-600">No photos selected.</div>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Add Part (auto-hide if Qty 0)'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN - parts list */}
        <div className="border rounded overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold">Parts</h2>
              <div className="text-xs text-gray-600">
                Showing {visibleParts.length} / {parts.length}
              </div>
            </div>

            <label className="text-xs text-gray-700 flex items-center gap-2">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
              />
              Show hidden / out-of-stock
            </label>
          </div>

          {visibleParts.map(p => {
            const out = p.quantity <= 0
            const state =
              out ? { label: 'Out of Stock', cls: 'bg-gray-200 text-gray-800' } :
              p.is_listed ? { label: 'Listed', cls: 'bg-green-100 text-green-800' } :
              { label: 'Hidden', cls: 'bg-yellow-100 text-yellow-800' }

            const dim = (!p.is_listed || out) ? 'opacity-70' : ''

            return (
              <div key={p.id} className={`border-t px-4 py-3 text-sm ${dim}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium truncate">{p.title}</div>
                      <span className={`text-xs px-2 py-0.5 rounded ${state.cls}`}>{state.label}</span>
                    </div>

                    <div className="text-gray-600 text-xs mt-1 flex items-center gap-2 flex-wrap">
                      <span>{p.category ?? '—'} • {p.condition ?? '—'}</span>

                      <span>•</span>

                      <span className="flex items-center gap-1">
                        Bin:
                        <InlineEditText
                          value={p.bin_location ?? ''}
                          placeholder="—"
                          disabled={busy}
                          onCommit={async (v) => {
                            const nv = v.trim()
                            await updatePart(p.id, { bin_location: nv ? nv : null }, 'Bin updated ✅')
                          }}
                        />
                      </span>

                      <span>•</span>

                      <QtyControl
                        qty={p.quantity ?? 0}
                        disabled={busy}
                        onDec={() => setQty(p, Math.max(0, (p.quantity ?? 0) - 1))}
                        onInc={() => setQty(p, (p.quantity ?? 0) + 1)}
                        onCommit={async (nv) => {
                          if (!Number.isFinite(nv) || nv < 0) {
                            setMsg('Qty must be 0 or more.')
                            return
                          }
                          await setQty(p, Math.floor(nv))
                        }}
                      />

                      <span>•</span>

                      <span className="flex items-center gap-1">
                        Price:
                        <InlineEditMoney
                          value={p.price}
                          disabled={busy}
                          onCommit={async (nv) => {
                            if (!Number.isFinite(nv) || nv < 0) {
                              setMsg('Price must be 0 or more.')
                              return
                            }
                            await updatePart(p.id, { price: nv }, 'Price updated ✅')
                          }}
                        />
                      </span>
                    </div>

                    <div className="text-gray-600 text-xs mt-1">
                      SKU: <span className="font-mono">{p.sku ?? '—'}</span> • PN: <span className="font-mono">{p.part_number ?? '—'}</span>
                    </div>

                    <div className="text-xs mt-2 flex gap-3 flex-wrap">
                      <Link className="underline" href={`/admin/parts/${p.id}`}>Edit</Link>
                      <Link className="underline" href={`/admin/parts/${p.id}/photos`}>Photos</Link>
                      <Link className="underline" href={`/parts/${p.id}`}>Public</Link>

                      <button className="underline" onClick={() => toggleList(p)} disabled={busy}>
                        {p.is_listed ? 'Unlist' : 'List'}
                      </button>

                      <button className="underline" onClick={() => soldOut(p)} disabled={busy}>
                        Sold Out
                      </button>

                      <button className="underline text-red-700" onClick={() => openDeletePart(p)} disabled={busy}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-semibold">${Number(p.price).toFixed(2)}</div>
                    <div className="text-xs text-gray-600 mt-1">{out ? 'Auto-hidden' : (p.is_listed ? 'Visible' : 'Hidden')}</div>
                  </div>
                </div>
              </div>
            )
          })}

          {visibleParts.length === 0 && (
            <div className="p-6 text-sm text-gray-600">
              {showHidden
                ? 'No parts yet. Add your first part on the left.'
                : 'No listed/in-stock parts. Turn on “Show hidden / out-of-stock” to manage everything.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ----------------- Small UI helpers ----------------- */

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/70" />
      <div className="relative max-w-[92vw] max-h-[92vh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="full" className="max-w-[92vw] max-h-[92vh] object-contain rounded-lg shadow-lg" />
        <button
          className="absolute top-3 right-3 bg-white/95 border rounded px-3 py-1 text-sm"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded p-4">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="mt-1 text-base font-medium">{value}</div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        className="border rounded p-2 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function InlineEditText({
  value,
  placeholder,
  disabled,
  onCommit,
}: {
  value: string
  placeholder?: string
  disabled?: boolean
  onCommit: (v: string) => Promise<void> | void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  const commit = async () => {
    setEditing(false)
    if (draft !== value) await onCommit(draft)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="px-2 py-0.5 rounded border bg-white hover:bg-gray-50 font-mono text-xs"
        onClick={() => !disabled && setEditing(true)}
        disabled={disabled}
        title="Click to edit"
      >
        {value?.trim() ? value : (placeholder ?? '—')}
      </button>
    )
  }

  return (
    <input
      className="px-2 py-0.5 rounded border font-mono text-xs w-24"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      autoFocus
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') cancel()
      }}
    />
  )
}

function InlineEditMoney({
  value,
  disabled,
  onCommit,
}: {
  value: number
  disabled?: boolean
  onCommit: (v: number) => Promise<void> | void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(Number(value ?? 0).toFixed(2))

  useEffect(() => {
    if (!editing) setDraft(Number(value ?? 0).toFixed(2))
  }, [value, editing])

  const parse = (s: string) => Number(String(s).replace(/[^0-9.]/g, ''))

  const commit = async () => {
    setEditing(false)
    const nv = parse(draft)
    if (Number.isFinite(nv) && nv.toFixed(2) !== Number(value ?? 0).toFixed(2)) {
      await onCommit(Number(nv.toFixed(2)))
    } else {
      setDraft(Number(value ?? 0).toFixed(2))
    }
  }

  const cancel = () => {
    setDraft(Number(value ?? 0).toFixed(2))
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="px-2 py-0.5 rounded border bg-white hover:bg-gray-50 font-mono text-xs"
        onClick={() => !disabled && setEditing(true)}
        disabled={disabled}
        title="Click to edit"
      >
        ${Number(value ?? 0).toFixed(2)}
      </button>
    )
  }

  return (
    <input
      className="px-2 py-0.5 rounded border font-mono text-xs w-24"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      autoFocus
      inputMode="decimal"
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') cancel()
      }}
    />
  )
}

function QtyControl({
  qty,
  disabled,
  onDec,
  onInc,
  onCommit,
}: {
  qty: number
  disabled: boolean
  onDec: () => void
  onInc: () => void
  onCommit: (n: number) => Promise<void> | void
}) {
  const isZero = qty <= 0
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(qty))

  useEffect(() => {
    if (!editing) setDraft(String(qty))
  }, [qty, editing])

  const commit = async () => {
    setEditing(false)
    const n = Number(draft)
    if (!Number.isFinite(n)) return
    if (Math.floor(n) !== qty) await onCommit(Math.floor(n))
  }

  const cancel = () => {
    setDraft(String(qty))
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-700">Qty</span>

      <div className="flex items-center border rounded overflow-hidden bg-white">
        <button
          type="button"
          className={`px-2 py-1 text-sm font-semibold disabled:opacity-40 ${
            isZero ? 'text-gray-400 cursor-not-allowed' : 'text-red-700 hover:bg-red-50'
          }`}
          onClick={onDec}
          disabled={disabled || isZero}
          aria-label="Decrease quantity"
          title={isZero ? 'Quantity is already 0' : 'Decrease quantity'}
        >
          −
        </button>

        <div className="border-l border-r">
          {!editing ? (
            <button
              type="button"
              className={`px-3 py-1 min-w-[2.5rem] text-center font-mono text-sm ${
                isZero ? 'bg-gray-50 text-gray-600' : 'bg-white text-gray-900 hover:bg-gray-50'
              }`}
              onClick={() => !disabled && setEditing(true)}
              disabled={disabled}
              title="Click to type quantity"
            >
              {qty}
            </button>
          ) : (
            <input
              className="px-2 py-1 w-[3.5rem] text-center font-mono text-sm outline-none"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              autoFocus
              inputMode="numeric"
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') cancel()
              }}
            />
          )}
        </div>

        <button
          type="button"
          className="px-2 py-1 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-40"
          onClick={onInc}
          disabled={disabled}
          aria-label="Increase quantity"
          title="Increase quantity"
        >
          +
        </button>
      </div>
    </div>
  )
}

function ConfirmModal({
  title,
  body,
  actionLabel,
  danger,
  onClose,
  onConfirm,
}: {
  title: string
  body: string
  actionLabel: string
  danger?: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50" />

      <div className="relative w-[92%] max-w-lg rounded-xl bg-white shadow-lg p-5">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{body}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button className="border rounded px-4 py-2" onClick={onClose} disabled={busy}>
            Cancel
          </button>

          <button
            className={`rounded px-4 py-2 text-white disabled:opacity-60 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-black'
            }`}
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm()
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Deleting…' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
