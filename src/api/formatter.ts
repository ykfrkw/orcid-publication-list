import type { Publication, CitationStyle } from '@/types'

function authorListForStyle(
  authors: string[],
  style: CitationStyle,
  boldNames: string[],
): string {
  if (authors.length === 0) return ''

  const boldify = (name: string): string => {
    const nameLower = name.toLowerCase()
    for (const bn of boldNames) {
      const parts = bn.toLowerCase().split(/\s+/)
      if (parts.every(p => nameLower.includes(p))) {
        return `<strong>${name}</strong>`
      }
    }
    return name
  }

  switch (style) {
    case 'vancouver': {
      // Vancouver: up to 6 authors, then et al.
      const formatted = authors.map(boldify)
      if (formatted.length > 6) {
        return formatted.slice(0, 6).join(', ') + ', et al'
      }
      return formatted.join(', ')
    }
    case 'apa': {
      // APA 7th: up to 20 authors
      const formatted = authors.map(boldify)
      if (formatted.length > 20) {
        return formatted.slice(0, 19).join(', ') + ', ... ' + formatted[formatted.length - 1]
      }
      if (formatted.length === 1) return formatted[0]
      return formatted.slice(0, -1).join(', ') + ', & ' + formatted[formatted.length - 1]
    }
    case 'harvard': {
      const formatted = authors.map(boldify)
      if (formatted.length > 3) {
        return formatted[0] + ' et al.'
      }
      if (formatted.length === 1) return formatted[0]
      return formatted.slice(0, -1).join(', ') + ' and ' + formatted[formatted.length - 1]
    }
    case 'chicago': {
      const formatted = authors.map(boldify)
      if (formatted.length > 10) {
        return formatted.slice(0, 7).join(', ') + ', et al.'
      }
      if (formatted.length === 1) return formatted[0]
      return formatted.slice(0, -1).join(', ') + ', and ' + formatted[formatted.length - 1]
    }
    case 'nature': {
      const formatted = authors.map(boldify)
      if (formatted.length > 5) {
        return formatted.slice(0, 5).join(', ') + ' et al.'
      }
      return formatted.join(', ')
    }
    default:
      return authors.map(boldify).join(', ')
  }
}

export function formatCitation(
  pub: Publication,
  style: CitationStyle,
  index: number,
  boldNames: string[],
): string {
  const authorStr = authorListForStyle(pub.authors, style, boldNames)
  const title = pub.title
  const journal = pub.journal
  const year = pub.year || ''
  const doiLink = pub.doi ? `https://doi.org/${pub.doi}` : ''

  switch (style) {
    case 'vancouver': {
      // N. Authors. Title. Journal. Year;Volume(Issue):Pages. doi:
      const parts = [
        `${index}.`,
        authorStr ? `${authorStr}.` : '',
        `${title}.`,
        journal ? `<em>${journal}</em>.` : '',
        year ? `${year}.` : '',
        doiLink ? `doi: <a href="${doiLink}" target="_blank" rel="noopener">${pub.doi}</a>` : '',
      ]
      return parts.filter(Boolean).join(' ')
    }
    case 'apa': {
      // Authors (Year). Title. Journal. doi
      const parts = [
        authorStr ? `${authorStr}` : '',
        year ? `(${year}).` : '',
        `${title}.`,
        journal ? `<em>${journal}</em>.` : '',
        doiLink ? `<a href="${doiLink}" target="_blank" rel="noopener">https://doi.org/${pub.doi}</a>` : '',
      ]
      return parts.filter(Boolean).join(' ')
    }
    case 'harvard': {
      // Authors (Year) 'Title', Journal. doi
      const parts = [
        authorStr ? `${authorStr}` : '',
        year ? `(${year})` : '',
        `'${title}',`,
        journal ? `<em>${journal}</em>.` : '',
        doiLink ? `doi: <a href="${doiLink}" target="_blank" rel="noopener">${pub.doi}</a>` : '',
      ]
      return parts.filter(Boolean).join(' ')
    }
    case 'chicago': {
      // Authors. "Title." Journal (Year). doi
      const parts = [
        authorStr ? `${authorStr}.` : '',
        `"${title}."`,
        journal ? `<em>${journal}</em>` : '',
        year ? `(${year}).` : '',
        doiLink ? `<a href="${doiLink}" target="_blank" rel="noopener">https://doi.org/${pub.doi}</a>` : '',
      ]
      return parts.filter(Boolean).join(' ')
    }
    case 'nature': {
      // Authors. Title. Journal Year. doi
      const parts = [
        authorStr ? `${authorStr}.` : '',
        `${title}.`,
        journal ? `<em>${journal}</em>` : '',
        year ? `<strong>${year}</strong>.` : '',
        doiLink ? `doi: <a href="${doiLink}" target="_blank" rel="noopener">${pub.doi}</a>` : '',
      ]
      return parts.filter(Boolean).join(' ')
    }
    default:
      return `${authorStr}. ${title}. ${journal}. ${year}.`
  }
}

export function formatPlainText(
  pub: Publication,
  style: CitationStyle,
  index: number,
  boldNames: string[],
): string {
  // Same as formatCitation but without HTML
  const html = formatCitation(pub, style, index, boldNames)
  return html
    .replace(/<strong>/g, '')
    .replace(/<\/strong>/g, '')
    .replace(/<em>/g, '')
    .replace(/<\/em>/g, '')
    .replace(/<a[^>]*>/g, '')
    .replace(/<\/a>/g, '')
}
