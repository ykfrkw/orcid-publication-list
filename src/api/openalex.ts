/**
 * OpenAlex API for enriching publication metadata.
 * Provides: authors, type (letter/editorial/article/review), PMID, journal.
 * CORS-enabled, free, no auth required.
 */

const OPENALEX_BASE = 'https://api.openalex.org/works'
const MAILTO = 'orcid-pub-list@example.com'

interface OpenAlexWork {
  type?: string
  type_crossref?: string
  ids?: {
    doi?: string
    pmid?: string
    openalex?: string
  }
  authorships?: Array<{
    raw_author_name?: string
    author?: { display_name?: string }
    author_position?: string
  }>
  primary_location?: {
    source?: { display_name?: string }
  }
  publication_year?: number
  title?: string
}

export interface OpenAlexMetadata {
  authors: string[]
  type: string           // letter, article, review, editorial, etc.
  journal?: string
  year?: number
  pmid?: string          // extracted from ids.pmid URL
}

function extractPmid(pmidUrl?: string): string | undefined {
  if (!pmidUrl) return undefined
  const match = pmidUrl.match(/\/(\d+)$/)
  return match ? match[1] : undefined
}

function formatAuthorName(displayName: string): string {
  // "Yuki Furukawa" → "Furukawa Y"
  const parts = displayName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  const family = parts[parts.length - 1]
  const initials = parts.slice(0, -1).map(p => p.charAt(0)).join('')
  return `${family} ${initials}`
}

async function fetchOpenAlexWork(doi: string): Promise<OpenAlexMetadata | null> {
  try {
    const res = await fetch(
      `${OPENALEX_BASE}/doi:${encodeURIComponent(doi)}?mailto=${MAILTO}`,
      { headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return null
    const work: OpenAlexWork = await res.json()

    const authors = (work.authorships ?? []).map(a => {
      const name = a.author?.display_name ?? a.raw_author_name ?? 'Unknown'
      return formatAuthorName(name)
    })

    return {
      authors,
      type: work.type ?? 'article',
      journal: work.primary_location?.source?.display_name,
      year: work.publication_year,
      pmid: extractPmid(work.ids?.pmid),
    }
  } catch {
    return null
  }
}

/**
 * Batch fetch with rate limiting (OpenAlex: 10 req/sec without key)
 */
export async function batchFetchOpenAlex(
  dois: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, OpenAlexMetadata>> {
  const results = new Map<string, OpenAlexMetadata>()
  const BATCH_SIZE = 8
  const DELAY = 1000

  for (let i = 0; i < dois.length; i += BATCH_SIZE) {
    const batch = dois.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async doi => {
      const meta = await fetchOpenAlexWork(doi)
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

/**
 * Map OpenAlex type to our category.
 * OpenAlex types: article, review, letter, editorial, erratum, paratext, etc.
 * See: https://api.openalex.org/types
 */
export function openAlexTypeToCategory(type: string): string {
  const t = type.toLowerCase()
  if (t === 'letter') return 'letter'
  if (t === 'editorial') return 'editorial'
  if (t === 'review') return 'review'
  if (t === 'article') return 'original'
  if (t === 'erratum' || t === 'paratext' || t === 'other'
    || t === 'book-chapter' || t === 'book' || t === 'dataset'
    || t === 'preprint' || t === 'dissertation') return 'other'
  return 'original'
}
