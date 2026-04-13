import type { Publication } from '@/types'

interface OrcidWorkSummary {
  title?: { title?: { value?: string } }
  type?: string
  'publication-date'?: {
    year?: { value?: string }
    month?: { value?: string }
    day?: { value?: string }
  }
  'journal-title'?: { value?: string }
  'external-ids'?: {
    'external-id'?: Array<{
      'external-id-type'?: string
      'external-id-value'?: string
    }>
  }
  'put-code'?: number
}

interface OrcidWorksResponse {
  group?: Array<{
    'work-summary'?: OrcidWorkSummary[]
  }>
}

export async function fetchOrcidWorks(orcidId: string): Promise<Publication[]> {
  const res = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/works`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`ORCID API error for ${orcidId}: ${res.status}`)
  const data: OrcidWorksResponse = await res.json()

  const publications: Publication[] = []

  for (const group of data.group ?? []) {
    const summary = group['work-summary']?.[0]
    if (!summary) continue

    const title = summary.title?.title?.value ?? ''
    const pubDate = summary['publication-date']
    const year = pubDate?.year?.value ? parseInt(pubDate.year.value) : 0
    const month = pubDate?.month?.value ? parseInt(pubDate.month.value) : undefined
    const day = pubDate?.day?.value ? parseInt(pubDate.day.value) : undefined
    const journal = summary['journal-title']?.value ?? ''
    const orcidType = summary.type ?? 'other'

    const externalIds = summary['external-ids']?.['external-id'] ?? []
    const doi = externalIds.find(e => e['external-id-type'] === 'doi')?.['external-id-value']
    const pmid = externalIds.find(e => e['external-id-type'] === 'pmid')?.['external-id-value']

    publications.push({
      title,
      authors: [],
      journal,
      year,
      month,
      day,
      doi: doi?.toLowerCase().replace(/^https?:\/\/doi\.org\//i, ''),
      pmid,
      type: orcidType,
      orcidType,
      sourceOrcidIds: [orcidId],
    })
  }

  return publications
}
