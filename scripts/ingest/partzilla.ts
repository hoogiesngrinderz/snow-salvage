import 'dotenv/config'
import PQueue from 'p-queue'
import * as cheerio from 'cheerio'
import { expandSitemap } from './lib/sitemap'
import { getSupabaseAdmin } from './lib/supabaseAdmin'

const supabase = getSupabaseAdmin()

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "referer": "https://www.partzilla.com/",
    },
  })

  const text = await res.text()

  if (!res.ok) {
    // Print a small snippet so we know what is blocking us
    const snippet = text.slice(0, 400).replace(/\s+/g, " ")
    throw new Error(`${res.status} ${url}\n${snippet}`)
  }

  return text
}

const SITEMAP = 'https://www.partzilla.com/sitemap/i/catalog/0.xml'

function isSnowmobile(u: string) {
  return u.includes('/catalog/') && u.includes('/snowmobile')
}

async function main() {
  const urls = (await expandSitemap(SITEMAP, fetchText)).filter(isSnowmobile)

  const queue = new PQueue({ interval: 1000, intervalCap: 1 })

  for (const url of urls) {
    queue.add(async () => {
      const html = await fetchText(url)
      const $ = cheerio.load(html)

      // You will implement:
      // - year → model links
      // - model → assembly links
      // - assembly → part table parsing

      // Then upsert into:
      // oem_makes, oem_models, oem_model_years,
      // oem_assemblies, oem_parts, oem_assembly_parts
    })
  }

  await queue.onIdle()
  console.log('Partzilla ingest complete')
}

main().catch(console.error)
