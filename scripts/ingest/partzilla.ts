import 'dotenv/config'
import PQueue from 'p-queue'
import * as cheerio from 'cheerio'
import { expandSitemap } from './lib/sitemap'
import { getSupabaseAdmin } from './lib/supabaseAdmin'

const supabase = getSupabaseAdmin()

async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'snow-salvage-bot/1.0 (contact: you@yourdomain.com)'
    }
  })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
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
