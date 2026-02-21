'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase'

type DonorRow = {
  id: string
  make: string | null
  model: string | null
  year: number | null
  cover_url: string | null
  parts_in_stock: number
}

type Theme = 'light' | 'dark'

export default function HomePage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [loading, setLoading] = useState(true)
  const [loadingDonors, setLoadingDonors] = useState(false)

  const [makes, setMakes] = useState<string[]>([])
  const [make, setMake] = useState<string>('')

  const [donors, setDonors] = useState<DonorRow[]>([])

  // Theme (persisted)
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    // initialize from localStorage, fall back to system preference
    const stored = typeof window !== 'undefined' ? (localStorage.getItem('theme') as Theme | null) : null
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored)
    } else if (typeof window !== 'undefined' && window.matchMedia) {
      setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('theme', theme)
  }, [theme])

  // Load manufacturers
  useEffect(() => {
    let cancelled = false

    const loadMakes = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('v_public_donors_in_stock')
        .select('make')
        .order('make', { ascending: true })

      if (cancelled) return

      if (error) {
        console.error(error)
        setMakes([])
        setMake('')
      } else {
        const unique = Array.from(
          new Set((data ?? []).map((r: any) => (r?.make ?? '').trim()).filter(Boolean))
        ) as string[]
        setMakes(unique)
        setMake(unique[0] ?? '')
      }

      setLoading(false)
    }

    loadMakes()
    return () => {
      cancelled = true
    }
  }, [supabase])

  // Load donors for selected make
  useEffect(() => {
    let cancelled = false

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

      if (cancelled) return

      if (error) {
        console.error(error)
        setDonors([])
      } else {
        setDonors((data ?? []) as DonorRow[])
      }

      setLoadingDonors(false)
    }

    loadDonors()
    return () => {
      cancelled = true
    }
  }, [make, supabase])

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

  const isDark = theme === 'dark'

  // Theme tokens (Tailwind class strings)
  const pageBg = isDark ? 'bg-[#070A0F] text-white' : 'bg-white text-black'
  const heroOverlayA = isDark ? 'bg-white/5' : 'bg-white/40'
  const heroOverlayB = isDark
    ? 'bg-gradient-to-b from-white/20 via-white/45 to-[#070A0F]'
    : 'bg-gradient-to-b from-white/40 via-white/70 to-white'

  const chip = isDark
    ? 'border border-black/10 bg-white/60 text-black/70'
    : 'border border-black/10 bg-white/70 text-black/70'

  const filterCard = isDark
    ? 'border border-black/10 bg-white/70'
    : 'border border-black/10 bg-white/80'

  const helperText = isDark ? 'text-white' : 'text-black/60'
  const muted = isDark ? 'text-white/60' : 'text-black/60'
  const muted2 = isDark ? 'text-white/50' : 'text-black/50'
  const modelText = isDark ? 'text-white/85' : 'text-black/80'

  const card = isDark
    ? 'border border-white/10 bg-white/[0.06] hover:bg-white/[0.09] shadow-[0_8px_30px_rgba(0,0,0,0.25)]'
    : 'border border-black/10 bg-white hover:bg-black/[0.03] shadow-md'

  const thumb = isDark ? 'border border-white/10 bg-black/25' : 'border border-black/10 bg-black/5'
  const divider = isDark
    ? 'h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent'
    : 'h-px bg-gradient-to-r from-transparent via-black/10 to-transparent'

  const footer = isDark
    ? 'border-white/10 text-white/45'
    : 'border-black/10 text-black/45'

  return (
    <div className={`min-h-screen ${pageBg}`}>
      {/* HERO */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{
            backgroundImage:
              'url(https://csfwkvvfhmlsgrtwaipk.supabase.co/storage/v1/object/public/donor-images/hero-snowmobile.jpg)',
          }}
        />
        <div className={`absolute inset-0 ${heroOverlayA}`} />
        <div className={`absolute inset-0 ${heroOverlayB}`} />
        {isDark && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_60%)]" />
        )}

        <div className="relative px-6 py-14 md:py-20 max-w-6xl mx-auto">
          {/* Top right theme toggle */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className={`rounded-full px-3 py-2 text-xs backdrop-blur border ${
                isDark ? 'border-white/15 bg-white/10 text-white' : 'border-black/10 bg-white/70 text-black'
              }`}
              aria-label="Toggle light/dark theme"
              title="Toggle theme"
            >
              {isDark ? '☾ Dark' : '☀ Light'}
            </button>
          </div>

          <div className="text-center">
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs backdrop-blur ${chip}`}>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Live inventory • Updated automatically
            </div>

            <h1 className={`mt-5 text-3xl md:text-5xl font-bold tracking-tight ${isDark ? 'text-black' : ''}`}>
              Raimer Performance and Maintenance
            </h1>

            <p className={`mt-3 text-sm md:text-base ${isDark ? 'text-black/100' : 'text-black/70'}`}>
              Snowmobile Donor and Part Inventory
            </p>
          </div>

          {/* Filter */}
          <div className="mt-10 md:mt-12">
            <div
              className={`mx-auto max-w-3xl rounded-2xl backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.18)] ${filterCard}`}
            >
              <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-left">
                  <div className={`text-xs font-medium ${isDark ? 'text-black/100' : ''}`}>Manufacturer</div>
                  <div className={`mt-1 text-sm ${isDark ? 'text-black/100' : 'text-black/60'}`}>
                    Choose a make to browse donors that have parts in stock.
                  </div>
                </div>

                <div className="w-full md:w-[340px]">
                  <select
                    className={`w-full rounded-xl px-3 py-2.5 outline-none focus:ring-2 ${
                      isDark
                        ? 'border border-black/10 bg-white text-black focus:ring-black/10'
                        : 'border border-black/10 bg-white text-black focus:ring-black/10'
                    }`}
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

                  <div className={`mt-2 text-xs ${isDark ? 'text-black/60' : 'text-black/60'}`}>
                    {loadingDonors ? 'Loading…' : `${totalDonors} donors • ${totalParts} parts in stock`}
                  </div>
                </div>
              </div>
            </div>

            <div className={`mt-4 text-center text-xs ${helperText}`}>
              Click a donor sled to view details and available parts.
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-6 pb-16 max-w-6xl mx-auto">
        {loading && <div className={`mt-8 text-sm ${muted}`}>Loading inventory…</div>}

        {!loading && make && !loadingDonors && grouped.length === 0 && (
          <div className={`mt-10 text-sm ${muted}`}>No donors found for {make}.</div>
        )}

        <div className="mt-10 space-y-12">
          {grouped.map((block) => (
            <section key={block.year}>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg md:text-xl font-semibold tracking-tight">{block.year}</h2>
                <div className={`text-xs ${muted2}`}>
                  {block.models.reduce((n, m) => n + m.donors.length, 0)} donor(s)
                </div>
              </div>

              <div className="mt-4 space-y-7">
                {block.models.map((m) => (
                  <div key={`${block.year}-${m.model}`}>
                    <div className={`text-sm font-medium ${modelText}`}>{m.model}</div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {m.donors.map((d) => (
                        <Link
                          key={d.id}
                          href={`/donor/${d.id}`}
                          className={`group rounded-2xl transition ${card}`}
                          title="View donor and available parts"
                        >
                          <div className="p-4 flex items-center gap-4">
                            {/* Thumbnail */}
                            <div className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 ${thumb}`}>
                              {d.cover_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={d.cover_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center text-[11px] ${isDark ? 'text-white/45' : 'text-black/40'}`}>
                                  No photo
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate">
                                {d.year ?? '—'} {d.make ?? ''} {d.model ?? ''}
                              </div>

                              <div className="mt-1 flex items-center justify-between gap-3">
                                <span className={`text-xs ${muted}`}>
                                  {d.parts_in_stock} parts in stock
                                </span>

                                <span
                                  className={`text-xs ${
                                    isDark
                                      ? 'text-sky-300/90 group-hover:text-sky-200 group-hover:underline'
                                      : 'text-sky-600 group-hover:text-sky-700 group-hover:underline'
                                  }`}
                                >
                                  View →
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className={`w-full ${divider}`} />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className={`mt-16 pt-8 border-t text-center text-xs ${footer}`}>
          © {new Date().getFullYear()} Raimer Performance and Maintenance
        </footer>
      </div>
    </div>
  )
}
