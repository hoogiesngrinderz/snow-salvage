import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({ ignoreAttributes: false })

export async function expandSitemap(
  startUrl: string,
  fetchText: (url: string) => Promise<string>
) {
  const urls: string[] = []
  const stack = [startUrl]
  const seen = new Set<string>()

  while (stack.length) {
    const url = stack.pop()!
    if (seen.has(url)) continue
    seen.add(url)

    const xml = parser.parse(await fetchText(url))

    if (xml.sitemapindex?.sitemap) {
      const maps = Array.isArray(xml.sitemapindex.sitemap)
        ? xml.sitemapindex.sitemap
        : [xml.sitemapindex.sitemap]

      for (const m of maps) stack.push(m.loc)
    }

    if (xml.urlset?.url) {
      const list = Array.isArray(xml.urlset.url)
        ? xml.urlset.url
        : [xml.urlset.url]

      for (const u of list) urls.push(u.loc)
    }
  }

  return urls
}
