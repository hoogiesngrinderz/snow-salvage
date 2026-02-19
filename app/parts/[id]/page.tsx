'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type PartRow = {
  id: string
  title: string
  category: string | null
  condition: string | null
  price: number
  quantity: number
  description: string | null
  created_at: string
}

type ImgRow = {
  id: string
  url: string
  sort_order: number
}

export default function PartDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [p, setP] = useState<PartRow | null>(null)
  const [imgs, setImgs] = useState<ImgRow[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const partReq = supabase
        .from('parts')
        .select('id,title,category,condition,price,quantity,description,created_at')
        .eq('id', id)
        .single()

      const imgReq = supabase
        .from('part_images')
        .select('id,url,sort_order')
        .eq('part_id', id)
        .order('sort_order', { ascending: true })

      const [partRes, imgRes] = await Promise.all([partReq, imgReq])

      if (!partRes.error) setP(partRes.data as PartRow)

      if (!imgRes.error && imgRes.data) {
        const arr = imgRes.data as ImgRow[]
        setImgs(arr)
        setActive(arr[0]?.url ?? null)
      } else {
        setImgs([])
        setActive(null)
      }

      setLoading(false)
    }

    load()
  }, [id])

  if (loading) return <div className="p-8">Loading…</div>
  if (!p) return <div className="p-8">Not found.</div>

  const inStock = p.quantity > 0

  return (
    <div className="p-8 max-w-4xl">
      <Link className="underline text-sm" href="/parts">← Back to parts</Link>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Photo gallery */}
        <div className="space-y-3">
          <div className="border rounded-lg aspect-square bg-gray-50 overflow-hidden">
            {active ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active} alt="Part photo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                No photos yet
              </div>
            )}
          </div>

          {imgs.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {imgs.slice(0, 10).map(im => (
                <button
                  key={im.id}
                  className={`border rounded overflow-hidden aspect-square ${active === im.url ? 'ring-2 ring-black' : ''}`}
                  onClick={() => setActive(im.url)}
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Listing info */}
        <div>
          <div className="text-xs text-gray-600">
            {p.category ?? '—'} • {p.condition ?? '—'}
          </div>

          <h1 className="mt-1 text-3xl font-bold">{p.title}</h1>

          <div className="mt-4 text-3xl font-extrabold">
            ${Number(p.price).toFixed(2)}
          </div>

          <div className="mt-2 text-sm">
            {inStock ? (
              <span className="text-green-700 font-medium">In stock</span>
            ) : (
              <span className="text-red-700 font-medium">Out of stock</span>
            )}
            <span className="text-gray-600"> • Qty {p.quantity}</span>
          </div>

          <div className="mt-6 flex gap-3 flex-wrap">
            <button
              className={`rounded px-5 py-3 text-white ${inStock ? 'bg-black' : 'bg-gray-400 cursor-not-allowed'}`}
              disabled={!inStock}
              title="Next step: Stripe checkout"
            >
              Buy Now (next)
            </button>

            <button
              className="border rounded px-5 py-3"
              title="Next step: request form"
            >
              Request this part (next)
            </button>
          </div>

          <div className="mt-8">
            <h2 className="font-semibold">Description</h2>
            <div className="mt-2 text-sm whitespace-pre-wrap border rounded p-3">
              {p.description?.trim() ? p.description : '—'}
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            Listed {new Date(p.created_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
