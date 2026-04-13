export interface OrcidEntry {
  orcidId: string
  displayName: string
}

export interface Publication {
  title: string
  authors: string[]
  journal: string
  year: number
  month?: number
  day?: number
  doi?: string
  pmid?: string
  type: string
  orcidType: string
  openAlexType?: string   // from OpenAlex: article, review, letter, editorial, preprint, etc.
  peerReviewApproved?: boolean  // for F1000Research/Wellcome: true if referee-approved
  sourceOrcidIds: string[]
}

export type PublicationCategory = 'original' | 'preprint' | 'letter' | 'editorial' | 'other'

export type CitationStyle = 'vancouver' | 'apa' | 'harvard' | 'chicago' | 'nature'

export type SortOrder = 'date' | 'first-author'

export interface YearRange {
  from?: number
  to?: number
}

export const CITATION_STYLES: { value: CitationStyle; label: string }[] = [
  { value: 'vancouver', label: 'Vancouver' },
  { value: 'apa', label: 'APA 7th' },
  { value: 'harvard', label: 'Harvard' },
  { value: 'chicago', label: 'Chicago' },
  { value: 'nature', label: 'Nature' },
]

export const CATEGORY_LABELS: Record<PublicationCategory, string> = {
  original: 'Original Articles & Reviews',
  preprint: 'Preprints',
  letter: 'Letters',
  editorial: 'Editorials',
  other: 'Other Publication Types',
}

// Preprint servers — journal names that indicate a preprint
const PREPRINT_SERVERS = [
  'medrxiv', 'biorxiv', 'arxiv', 'ssrn', 'chemrxiv', 'psyarxiv',
  'preprints.org', 'research square', 'authorea',
]

function isFromPreprintServer(journal: string): boolean {
  const j = journal.toLowerCase()
  return PREPRINT_SERVERS.some(s => j.includes(s))
}

// Open peer-review journals (F1000Research, Wellcome Open Research, etc.)
// These need Crossref referee-status check to determine approved vs preprint
const OPEN_REVIEW_JOURNALS = [
  'f1000research', 'f1000 research', 'wellcome open research',
  'gates open research', 'hrb open research',
]

export function isOpenReviewJournal(journal: string): boolean {
  const j = journal.toLowerCase()
  return OPEN_REVIEW_JOURNALS.some(s => j.includes(s))
}

export function categorizeWork(pub: Publication): PublicationCategory {
  const journal = pub.journal ?? ''
  const oaType = pub.openAlexType?.toLowerCase() ?? ''
  const orcidType = pub.orcidType.toLowerCase()

  // 1. Check preprint servers first (regardless of OpenAlex type)
  if (isFromPreprintServer(journal)) return 'preprint'
  if (orcidType === 'preprint' && !isOpenReviewJournal(journal)) return 'preprint'

  // 2. Open peer-review journals: approved → original, otherwise → preprint
  if (isOpenReviewJournal(journal)) {
    return pub.peerReviewApproved ? 'original' : 'preprint'
  }

  // 3. OpenAlex type is authoritative when available
  if (oaType) {
    if (oaType === 'letter') return 'letter'
    if (oaType === 'editorial') return 'editorial'
    // article + review → both go to 'original'
    if (oaType === 'article' || oaType === 'review') return 'original'
    if (oaType === 'preprint') return 'preprint'
    if (oaType === 'erratum' || oaType === 'paratext') return 'other'
  }

  // 4. Fallback to ORCID type
  if (orcidType === 'journal-article' || orcidType === 'review') return 'original'
  if (orcidType.includes('letter')) return 'letter'
  if (orcidType.includes('editorial') || orcidType.includes('comment')) return 'editorial'
  if (orcidType.includes('book') || orcidType.includes('chapter') || orcidType.includes('conference')
    || orcidType.includes('abstract') || orcidType.includes('report')
    || orcidType.includes('dissertation') || orcidType.includes('working-paper')
    || orcidType.includes('other')) return 'other'

  return 'original'
}
