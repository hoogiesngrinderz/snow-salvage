import PQueue from 'p-queue'
import * as cheerio from 'cheerio'
import { expandSitemap } from './lib/sitemap'
import { getSupabaseAdmin } from './lib/supabaseAdmin'

const supabase = getSupabaseAdmin()

const SITEMAP = 'https://www.partzilla.com/sitemap/i/catalog/0.xml'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchText(url: string): Promise<string> {
  const retries = 4
  const baseBackoffMs = 1500

  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`[fetchText] ${attempt}/${retries} → ${url}`)

    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        accept: 'application/xml,text/xml,text/html,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        pragma: 'no-cache',
        'cache-control': 'no-cache',
        referer: 'https://www.partzilla.com/',
      },
    })

    const text = await res.text()

    if (res.ok) return text

    const snippet = text.slice(0, 600).replace(/\s+/g, ' ')
    console.warn(
      `[fetchText] HTTP ${res.status} for ${url} :: ${snippet || '[empty body]'}`
    )

    // Retry on common transient / bot-block responses (403/429) + server errors
    const retryable = res.status === 403 || res.status === 429 || res.status >= 500
    if (!retryable || attempt === retries) {
      throw new Error(`HTTP ${res.status} ${url} :: ${snippet || '[empty body]'}`)
    }

    await sleep(baseBackoffMs * attempt)
  }

  throw new Error(`fetchText failed unexpectedly: ${url}`)
}

function isSnowmobile(u: string) {
  return u.includes('/catalog/') && u.includes('/snowmobile')
}

async function main() {
  console.log('[partzilla] starting sitemap expand:', SITEMAP)

  const urls = (await expandSitemap(SITEMAP, fetchText)).filter(isSnowmobile)

  console.log(`[partzilla] snowmobile urls found: ${urls.length}`)

  const queue = new PQueue({ interval: 1000, intervalCap: 1 })

  for (const url of urls) {
    queue.add(async () => {
      const html = await fetchText(url)
      const $ = cheerio.load(html)

      // TODO: implement parsing + upserts into Supabase
      // leaving placeholder to keep pipeline running
      const title = $('title').text().trim()
      console.log('[partzilla] fetched:', url, title ? `(${title})` : '')
    })
  }

  await queue.onIdle()
  console.log('Partzilla ingest complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
