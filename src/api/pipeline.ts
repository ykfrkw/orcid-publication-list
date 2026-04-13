import type { OrcidEntry, Publication, PublicationCategory } from '@/types'
import { categorizeWork } from '@/types'
import { fetchOrcidWorks } from './orcid'
import { batchFetchCrossref } from './crossref'

export interface FetchProgress {
  stage: 'orcid' | 'crossref' | 'done'
  message: string
  percent: number
}

export interface PipelineResult {
  publications: Publication[]
  categorized: Record<PublicationCategory, Publication[]>
  errors: string[]
}

function deduplicatePublications(pubs: Publication[]): Publication[] {
  const byDoi = new Map<string, Publication>()
  const byTitle = new Map<string, Publication>()

  for (const pub of pubs) {
    const doiKey = pub.doi?.toLowerCase()
    const titleKey = pub.title.toLowerCase().replace(/[^a-z0-9]/g, '')

    const existing = (doiKey && byDoi.get(doiKey)) || byTitle.get(titleKey)

    if (existing) {
      for (const id of pub.sourceOrcidIds) {
        if (!existing.sourceOrcidIds.includes(id)) {
          existing.sourceOrcidIds.push(id)
        }
      }
      if (!existing.doi && pub.doi) existing.doi = pub.doi
      if (!existing.pmid && pub.pmid) existing.pmid = pub.pmid
      if (!existing.journal && pub.journal) existing.journal = pub.journal
    } else {
      if (doiKey) byDoi.set(doiKey, pub)
      byTitle.set(titleKey, pub)
    }
  }

  const seen = new Set<Publication>()
  const result: Publication[] = []
  for (const pub of byDoi.values()) {
    if (!seen.has(pub)) { seen.add(pub); result.push(pub) }
  }
  for (const pub of byTitle.values()) {
    if (!seen.has(pub)) { seen.add(pub); result.push(pub) }
  }

  return result
}

export async function runPipeline(
  entries: OrcidEntry[],
  yearFilter?: number,
  onProgress?: (p: FetchProgress) => void,
): Promise<PipelineResult> {
  const errors: string[] = []
  let allPubs: Publication[] = []

  // Stage 1: Fetch from ORCID
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    onProgress?.({
      stage: 'orcid',
      message: `Fetching ORCID works for ${entry.displayName} (${i + 1}/${entries.length})...`,
      percent: Math.round(((i + 1) / entries.length) * 40),
    })
    try {
      const pubs = await fetchOrcidWorks(entry.orcidId)
      allPubs.push(...pubs)
    } catch (e) {
      errors.push(`Failed to fetch ${entry.orcidId} (${entry.displayName}): ${e}`)
    }
  }

  // Filter by year
  if (yearFilter) {
    allPubs = allPubs.filter(p => p.year === yearFilter)
  }

  // Deduplicate
  allPubs = deduplicatePublications(allPubs)

  // Stage 2: Enrich via Crossref
  const doisToFetch = allPubs.filter(p => p.doi).map(p => p.doi!)
  onProgress?.({
    stage: 'crossref',
    message: `Enriching ${doisToFetch.length} publications via Crossref...`,
    percent: 45,
  })

  const crossrefData = await batchFetchCrossref(doisToFetch, (done, total) => {
    onProgress?.({
      stage: 'crossref',
      message: `Enriching via Crossref (${done}/${total})...`,
      percent: 45 + Math.round((done / total) * 50),
    })
  })

  // Merge Crossref data
  for (const pub of allPubs) {
    if (pub.doi) {
      const meta = crossrefData.get(pub.doi.toLowerCase())
      if (meta) {
        if (meta.authors.length > 0) pub.authors = meta.authors
        if (meta.journal) pub.journal = meta.journal
        if (meta.type) {
          if (meta.type === 'journal-article' && pub.orcidType === 'journal-article') {
            pub.type = 'journal-article'
          }
        }
      }
    }
  }

  // Sort by year desc, then by first author
  allPubs.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year
    const aMonth = a.month ?? 0
    const bMonth = b.month ?? 0
    if (bMonth !== aMonth) return bMonth - aMonth
    return (a.authors[0] ?? a.title).localeCompare(b.authors[0] ?? b.title)
  })

  // Categorize
  const categorized: Record<PublicationCategory, Publication[]> = {
    original: [],
    review: [],
    letter: [],
    editorial: [],
    other: [],
  }
  for (const pub of allPubs) {
    const cat = categorizeWork(pub.orcidType)
    categorized[cat].push(pub)
  }

  onProgress?.({
    stage: 'done',
    message: `Done! Found ${allPubs.length} publications.`,
    percent: 100,
  })

  return { publications: allPubs, categorized, errors }
}
