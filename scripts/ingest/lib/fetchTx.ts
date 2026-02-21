const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  accept: "application/xml,text/xml,text/html,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  pragma: "no-cache",
  "cache-control": "no-cache",
  referer: "https://www.partzilla.com/",
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function fetchText(
  url: string,
  opts?: { retries?: number; backoffMs?: number }
): Promise<string> {
  const retries = opts?.retries ?? 3
  const backoffMs = opts?.backoffMs ?? 1500

  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`[fetchText] attempt ${attempt}/${retries} → ${url}`)

    const res = await fetch(url, {
      redirect: "follow",
      headers: DEFAULT_HEADERS,
    })

    const text = await res.text()

    if (res.ok) {
      return text
    }

    const snippet = text.slice(0, 500).replace(/\s+/g, " ")

    console.warn(
      `[fetchText] HTTP ${res.status} on ${url}\n${snippet || "[empty body]"}`
    )

    if (attempt < retries) {
      await sleep(backoffMs * attempt)
    }
  }

  throw new Error(`fetchText failed after ${retries} attempts: ${url}`)
}
