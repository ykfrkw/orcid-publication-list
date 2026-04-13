import type { OrcidEntry, Publication, PublicationCategory, YearRange, SortOrder } from '@/types'
import { categorizeWork } from '@/types'
import { fetchOrcidWorks, fetchOrcidName } from './orcid'
import { batchFetchOpenAlex } from './openalex'

export interface FetchProgress {
  stage: 'orcid' | 'openalex' | 'done'
  message: string
  percent: number
}

export interface PipelineResult {
  publications: Publication[]
  categorized: Record<PublicationCategory, Publication[]>
  boldNames: string[]  // names resolved from ORCID profiles
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
  yearRange?: YearRange,
  sortOrder: SortOrder = 'date',
  onProgress?: (p: FetchProgress) => void,
): Promise<PipelineResult> {
  const errors: string[] = []
  const boldNames: string[] = []
  let allPubs: Publication[] = []

  // Stage 1: Fetch from ORCID (works + profile names)
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    onProgress?.({
      stage: 'orcid',
      message: `Fetching ORCID works for ${entry.displayName} (${i + 1}/${entries.length})...`,
      percent: Math.round(((i + 1) / entries.length) * 30),
    })
    try {
      const [pubs, orcidName] = await Promise.all([
        fetchOrcidWorks(entry.orcidId),
        fetchOrcidName(entry.orcidId),
      ])
      allPubs.push(...pubs)
      // Collect bold names: ORCID profile name + user-provided displayName
      if (orcidName) boldNames.push(orcidName)
      if (entry.displayName && !entry.displayName.match(/^\d{4}-/)) {
        boldNames.push(entry.displayName)
      }
    } catch (e) {
      errors.push(`Failed to fetch ${entry.orcidId} (${entry.displayName}): ${e}`)
    }
  }

  // Filter by year range
  if (yearRange?.from || yearRange?.to) {
    allPubs = allPubs.filter(p => {
      if (yearRange.from && p.year < yearRange.from) return false
      if (yearRange.to && p.year > yearRange.to) return false
      return true
    })
  }

  // Deduplicate
  allPubs = deduplicatePublications(allPubs)

  // Stage 2: Enrich via OpenAlex (authors, type, PMID, journal)
  const doisToFetch = allPubs.filter(p => p.doi).map(p => p.doi!)
  onProgress?.({
    stage: 'openalex',
    message: `Enriching ${doisToFetch.length} publications via OpenAlex...`,
    percent: 35,
  })

  const openAlexData = await batchFetchOpenAlex(doisToFetch, (done, total) => {
    onProgress?.({
      stage: 'openalex',
      message: `Enriching via OpenAlex (${done}/${total})...`,
      percent: 35 + Math.round((done / total) * 60),
    })
  })

  // Merge OpenAlex data
  for (const pub of allPubs) {
    if (pub.doi) {
      const meta = openAlexData.get(pub.doi.toLowerCase())
      if (meta) {
        if (meta.authors.length > 0) pub.authors = meta.authors
        if (meta.journal) pub.journal = meta.journal
        if (meta.pmid && !pub.pmid) pub.pmid = meta.pmid
        pub.openAlexType = meta.type
      }
    }
  }

  // Sort
  if (sortOrder === 'first-author') {
    allPubs.sort((a, b) => {
      const aAuthor = (a.authors[0] ?? a.title).toLowerCase()
      const bAuthor = (b.authors[0] ?? b.title).toLowerCase()
      if (aAuthor !== bAuthor) return aAuthor.localeCompare(bAuthor)
      return b.year - a.year
    })
  } else {
    allPubs.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year
      const aMonth = a.month ?? 0
      const bMonth = b.month ?? 0
      if (bMonth !== aMonth) return bMonth - aMonth
      return (a.authors[0] ?? a.title).localeCompare(b.authors[0] ?? b.title)
    })
  }

  // Categorize
  const categorized: Record<PublicationCategory, Publication[]> = {
    original: [],
    preprint: [],
    letter: [],
    editorial: [],
    other: [],
  }
  for (const pub of allPubs) {
    const cat = categorizeWork(pub)
    categorized[cat].push(pub)
  }

  onProgress?.({
    stage: 'done',
    message: `Done! Found ${allPubs.length} publications.`,
    percent: 100,
  })

  return { publications: allPubs, categorized, boldNames, errors }
}
