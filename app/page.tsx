'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase'


/**
 * DROP-IN FILE
 * Save as: app/page.tsx
 *
 * Background image:
 * Put your generated image at: /public/hero-sled.jpg
 */

type DonorRow = {
  id: string
  make: string | null
  model: string | null
  year: number | null
  cover_url: string | null
  parts_in_stock: number
}

export default function HomePage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [loading, setLoading] = useState(true)
  const [loadingDonors, setLoadingDonors] = useState(false)

  const [makes, setMakes] = useState<string[]>([])
  const [make, setMake] = useState<string>('')

  const [donors, setDonors] = useState<DonorRow[]>([])

  // Load manufacturers (only those with stock)
  useEffect(() => {
    const loadMakes = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('v_public_donors_in_stock')
        .select('make')
        .order('make', { ascending: true })

      if (error) {
        console.error(error)
        setMakes([])
        setMake('')
        setLoading(false)
        return
      }

      const unique = Array.from(
        new Set((data ?? []).map((r: any) => (r?.make ?? '').trim()).filter(Boolean))
      ) as string[]

      setMakes(unique)
      setMake(unique[0] ?? '')
      setLoading(false)
    }

    loadMakes()
  }, [])

  // Load donors for selected manufacturer
  useEffect(() => {
    const loadDonors = async () => {
      if (!make) {
        setDonors([])
        return
      }

      setLoadingDonors(true)

      const { data, error } = await supabase
        .from('v_public_donors_in_stock')
        .select('id,make,model,year,cover_url,parts_in_stock')
        .eq('make', make)
        .order('year', { ascending: false })
        .order('model', { ascending: true })

      if (error) {
        console.error(error)
        setDonors([])
        setLoadingDonors(false)
        return
      }

      setDonors((data ?? []) as DonorRow[])
      setLoadingDonors(false)
    }

    loadDonors()
  }, [make])

  // Group donors by Year → Model
  const grouped = useMemo(() => {
    const byYear: Record<string, Record<string, DonorRow[]>> = {}

    for (const d of donors) {
      const year = d.year ? String(d.year) : '—'
      const model = (d.model ?? '—').trim() || '—'
      byYear[year] ||= {}
      byYear[year][model] ||= []
      byYear[year][model].push(d)
    }

    const years = Object.keys(byYear).sort((a, b) => {
      if (a === '—') return 1
      if (b === '—') return -1
      return Number(b) - Number(a)
    })

    return years.map((year) => ({
      year,
      models: Object.keys(byYear[year])
        .sort((a, b) => a.localeCompare(b))
        .map((model) => ({ model, donors: byYear[year][model] })),
    }))
  }, [donors])

  const totalDonors = donors.length
  const totalParts = donors.reduce((s, d) => s + (d.parts_in_stock || 0), 0)

  return (
    <div className="min-h-screen bg-[#070A0F] text-white">
      {/* HERO */}
      <div className="relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url(https://csfwkvvfhmlsgrtwaipk.supabase.co/storage/v1/object/public/donor-images/hero-snowmobile.jpg)` }}
        />

        {/* ✅ UPDATED: lighter / opaque overlay */}
        <div className="absolute inset-0 bg-white/5" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/45 to-[#070A0F]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_60%)]" />

        <div className="relative px-6 py-14 md:py-20 max-w-6xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-2 text-xs text-black/70 backdrop-blur">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Live inventory • Updated automatically
            </div>

            <h1 className="mt-5 text-3xl md:text-5xl font-bold tracking-tight text-black">
              Raimer Performance and Maintenance
            </h1>

            <p className="mt-3 text-sm md:text-base text-black/100">
              Snowmobile Donor and Part Inventory
            </p>
          </div>

          {/* Glass filter bar */}
          <div className="mt-10 md:mt-12">
            <div className="mx-auto max-w-3xl rounded-2xl border border-black/10 bg-white/70 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
              <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-left">
                  <div className="text-xs font-medium text-black/100">Manufacturer</div>
                  <div className="mt-1 text-sm text-black/100">
                    Choose a make to browse donors that have parts in stock.
                  </div>
                </div>

                <div className="w-full md:w-[340px]">
                  <select
                    className="w-full rounded-xl border border-black/10 bg-white text-black px-3 py-2.5 outline-none
                               focus:border-black/20 focus:ring-2 focus:ring-black/10"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    disabled={loading}
                  >
                    {makes.length === 0 ? (
                      <option value="">No inventory</option>
                    ) : (
                      makes.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))
                    )}
                  </select>

                  <div className="mt-2 text-xs text-black/60">
                    {loadingDonors ? 'Loading…' : `${totalDonors} donors • ${totalParts} parts in stock`}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-white">
              Click a donor sled to view details and available parts.
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-6 pb-16 max-w-6xl mx-auto">
        {loading && (
          <div className="mt-8 text-sm text-white/70">Loading inventory…</div>
        )}

        {!loading && make && !loadingDonors && grouped.length === 0 && (
          <div className="mt-10 text-sm text-white/70">No donors found for {make}.</div>
        )}

        <div className="mt-10 space-y-12">
          {grouped.map((block) => (
            <section key={block.year}>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg md:text-xl font-semibold tracking-tight">
                  {block.year}
                </h2>
                <div className="text-xs text-white/50">
                  {block.models.reduce((n, m) => n + m.donors.length, 0)} donor(s)
                </div>
              </div>

              <div className="mt-4 space-y-7">
                {block.models.map((m) => (
                  <div key={`${block.year}-${m.model}`}>
                    <div className="text-sm font-medium text-white/85">
                      {m.model}
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {m.donors.map((d) => (
                        <Link
                          key={d.id}
                          href={`/donor/${d.id}`}
                          className="group rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.09]
                                     transition shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
                          title="View donor and available parts"
                        >
                          <div className="p-4 flex items-center gap-4">
                            {/* Thumbnail */}
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-black/25 shrink-0">
                              {d.cover_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={d.cover_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    const img = e.currentTarget
                                    img.style.display = 'none'
                                  }}
                                />
                              ) : null}

                              <div className="w-full h-full flex items-center justify-center text-[11px] text-white/45">
                                {d.cover_url ? '—' : 'No photo'}
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate">
                                {d.year ?? '—'} {d.make ?? ''} {d.model ?? ''}
                              </div>

                              <div className="mt-1 flex items-center justify-between gap-3">
                                <span className="text-xs text-white/60">
                                  {d.parts_in_stock} parts in stock
                                </span>

                                <span className="text-xs text-sky-300/90 group-hover:text-sky-200 group-hover:underline">
                                  View →
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-16 pt-8 border-t border-white/10 text-center text-xs text-white/45">
          © {new Date().getFullYear()} Raimer Performance and Maintenance
        </footer>
      </div>
    </div>
  )
}
