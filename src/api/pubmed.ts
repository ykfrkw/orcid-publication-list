/**
 * Fetch publication types from PubMed ESummary API.
 * PubMed distinguishes Letter, Editorial, Comment, Review, Journal Article etc.
 */

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const ESUMMARY_BASE = `${EUTILS_BASE}/esummary.fcgi`
const ESEARCH_BASE = `${EUTILS_BASE}/esearch.fcgi`

interface PubMedDocSum {
  uid: string
  pubtype?: string[]
}

interface ESummaryResult {
  result?: {
    uids?: string[]
    [pmid: string]: PubMedDocSum | string[] | undefined
  }
}

export interface PubMedTypeInfo {
  pubTypes: string[]  // e.g. ["Journal Article", "Letter", "Research Support, N.I.H., Extramural"]
}

export async function batchFetchPubMedTypes(
  pmids: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, PubMedTypeInfo>> {
  const results = new Map<string, PubMedTypeInfo>()
  if (pmids.length === 0) return results

  // PubMed allows up to 200 IDs per request
  const BATCH_SIZE = 200
  const DELAY = 400

  for (let i = 0; i < pmids.length; i += BATCH_SIZE) {
    const batch = pmids.slice(i, i + BATCH_SIZE)
    const ids = batch.join(',')

    try {
      const res = await fetch(
        `${ESUMMARY_BASE}?db=pubmed&id=${ids}&retmode=json`,
        { headers: { Accept: 'application/json' } },
      )
      if (!res.ok) continue

      const data: ESummaryResult = await res.json()
      const uids = data.result?.uids ?? []

      for (const uid of uids) {
        const doc = data.result?.[uid] as PubMedDocSum | undefined
        if (doc?.pubtype) {
          results.set(uid, { pubTypes: doc.pubtype })
        }
      }
    } catch {
      // Silently skip failed batches
    }

    onProgress?.(Math.min(i + BATCH_SIZE, pmids.length), pmids.length)

    if (i + BATCH_SIZE < pmids.length) {
      await new Promise(r => setTimeout(r, DELAY))
    }
  }

  return results
}

/**
 * Look up PMIDs for DOIs that don't have a PMID yet.
 * Uses PubMed ESearch: term=DOI[doi]
 */
export async function batchLookupPmidsByDoi(
  dois: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, string>> {
  const results = new Map<string, string>() // doi -> pmid
  if (dois.length === 0) return results

  const BATCH_SIZE = 5
  const DELAY = 400

  for (let i = 0; i < dois.length; i += BATCH_SIZE) {
    const batch = dois.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async doi => {
      try {
        const res = await fetch(
          `${ESEARCH_BASE}?db=pubmed&term=${encodeURIComponent(doi)}[doi]&retmode=json`,
        )
        if (!res.ok) return
        const data = await res.json()
        const idList: string[] = data?.esearchresult?.idlist ?? []
        if (idList.length === 1) {
          results.set(doi.toLowerCase(), idList[0])
        }
      } catch {
        // skip
      }
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
 * Map PubMed publication types to our category.
 * PubMed types: "Journal Article", "Review", "Letter", "Editorial", "Comment",
 *   "Meta-Analysis", "Systematic Review", "Randomized Controlled Trial", etc.
 */
export function pubmedTypeToCategory(pubTypes: string[]): string {
  const types = pubTypes.map(t => t.toLowerCase())

  // Check specific types first (most specific wins)
  if (types.includes('letter')) return 'letter'
  if (types.includes('editorial')) return 'editorial'
  if (types.includes('comment')) return 'editorial'

  // Reviews
  if (types.includes('review') || types.includes('systematic review') || types.includes('meta-analysis')) {
    return 'review'
  }

  // Default: original article
  if (types.includes('journal article')) return 'original'

  return 'unknown'
}
