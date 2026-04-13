const CROSSREF_BASE = 'https://api.crossref.org/works'
const MAILTO = 'orcid-pub-list@example.com'

interface CrossrefAuthor {
  given?: string
  family?: string
  name?: string
  sequence?: string
}

interface CrossrefWork {
  author?: CrossrefAuthor[]
  type?: string
  title?: string[]
  'container-title'?: string[]
  published?: { 'date-parts'?: number[][] }
  'published-print'?: { 'date-parts'?: number[][] }
  'published-online'?: { 'date-parts'?: number[][] }
  volume?: string
  issue?: string
  page?: string
  DOI?: string
}

export interface EnrichedMetadata {
  authors: string[]
  type?: string
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  year?: number
}

export async function fetchCrossrefMetadata(doi: string): Promise<EnrichedMetadata | null> {
  try {
    const res = await fetch(
      `${CROSSREF_BASE}/${encodeURIComponent(doi)}?mailto=${MAILTO}`,
      { headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return null
    const data = await res.json()
    const work: CrossrefWork = data.message

    const authors = (work.author ?? []).map(a => {
      if (a.family && a.given) return `${a.family} ${a.given.charAt(0)}`
      if (a.family) return a.family
      return a.name ?? 'Unknown'
    })

    const dateParts = work.published?.['date-parts']?.[0]
      ?? work['published-print']?.['date-parts']?.[0]
      ?? work['published-online']?.['date-parts']?.[0]

    return {
      authors,
      type: work.type,
      journal: work['container-title']?.[0],
      volume: work.volume,
      issue: work.issue,
      pages: work.page,
      year: dateParts?.[0],
    }
  } catch {
    return null
  }
}

// Batch fetch with rate limiting (polite: ~5 req/sec)
export async function batchFetchCrossref(
  dois: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, EnrichedMetadata>> {
  const results = new Map<string, EnrichedMetadata>()
  const BATCH_SIZE = 5
  const DELAY = 1100

  for (let i = 0; i < dois.length; i += BATCH_SIZE) {
    const batch = dois.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async doi => {
      const meta = await fetchCrossrefMetadata(doi)
      if (meta) results.set(doi.toLowerCase(), meta)
    })
    await Promise.all(promises)
    onProgress?.(Math.min(i + BATCH_SIZE, dois.length), dois.length)

    if (i + BATCH_SIZE < dois.length) {
      await new Promise(r => setTimeout(r, DELAY))
    }
  }

  return results
}
