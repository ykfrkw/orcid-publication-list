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
  sourceOrcidIds: string[]
}

export type PublicationCategory = 'original' | 'review' | 'letter' | 'editorial' | 'other'

export type CitationStyle = 'vancouver' | 'apa' | 'harvard' | 'chicago' | 'nature'

export const CITATION_STYLES: { value: CitationStyle; label: string }[] = [
  { value: 'vancouver', label: 'Vancouver' },
  { value: 'apa', label: 'APA 7th' },
  { value: 'harvard', label: 'Harvard' },
  { value: 'chicago', label: 'Chicago' },
  { value: 'nature', label: 'Nature' },
]

export const CATEGORY_LABELS: Record<PublicationCategory, string> = {
  original: 'Original Articles',
  review: 'Reviews',
  letter: 'Letters',
  editorial: 'Editorials',
  other: 'Other Publication Types',
}

export function categorizeWork(orcidType: string): PublicationCategory {
  const t = orcidType.toLowerCase()
  if (t === 'journal-article') return 'original'
  if (t === 'review') return 'review'
  if (t.includes('letter')) return 'letter'
  if (t.includes('editorial') || t.includes('comment')) return 'editorial'
  if (t.includes('book') || t.includes('chapter') || t.includes('conference')
    || t.includes('abstract') || t.includes('preprint') || t.includes('report')
    || t.includes('dissertation') || t.includes('working-paper')
    || t.includes('other')) return 'other'
  return 'original'
}
