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
        return `<strong><u>${name}</u></strong>`
      }
    }
    return name
  }

  // Apply boldify to ALL authors first, then truncate per style.
  // This ensures highlighted authors are never lost.
  const allFormatted = authors.map(boldify)
  const isHighlighted = (s: string) => s.startsWith('<strong>')

  // If truncation would hide a highlighted author, include them explicitly.
  const truncateWithHighlighted = (visible: string[], rest: string[], suffix: string): string => {
    const hiddenHighlighted = rest.filter(isHighlighted)
    if (hiddenHighlighted.length === 0) {
      return visible.join(', ') + suffix
    }
    return visible.join(', ') + ', ...' + hiddenHighlighted.join(', ') + suffix
  }

  switch (style) {
    case 'vancouver': {
      if (allFormatted.length > 6) {
        return truncateWithHighlighted(allFormatted.slice(0, 6), allFormatted.slice(6), ', et al')
      }
      return allFormatted.join(', ')
    }
    case 'apa': {
      if (allFormatted.length > 20) {
        const visible = allFormatted.slice(0, 19)
        const last = allFormatted[allFormatted.length - 1]
        const rest = allFormatted.slice(19, -1)
        const hiddenHighlighted = rest.filter(isHighlighted)
        if (hiddenHighlighted.length === 0) {
          return visible.join(', ') + ', ... ' + last
        }
        return visible.join(', ') + ', ...' + hiddenHighlighted.join(', ') + ', ... ' + last
      }
      if (allFormatted.length === 1) return allFormatted[0]
      return allFormatted.slice(0, -1).join(', ') + ', & ' + allFormatted[allFormatted.length - 1]
    }
    case 'harvard': {
      if (allFormatted.length > 3) {
        return truncateWithHighlighted(allFormatted.slice(0, 1), allFormatted.slice(1), ' et al.')
      }
      if (allFormatted.length === 1) return allFormatted[0]
      return allFormatted.slice(0, -1).join(', ') + ' and ' + allFormatted[allFormatted.length - 1]
    }
    case 'chicago': {
      if (allFormatted.length > 10) {
        return truncateWithHighlighted(allFormatted.slice(0, 7), allFormatted.slice(7), ', et al.')
      }
      if (allFormatted.length === 1) return allFormatted[0]
      return allFormatted.slice(0, -1).join(', ') + ', and ' + allFormatted[allFormatted.length - 1]
    }
    case 'nature': {
      if (allFormatted.length > 5) {
        return truncateWithHighlighted(allFormatted.slice(0, 5), allFormatted.slice(5), ' et al.')
      }
      return allFormatted.join(', ')
    }
    default:
      return allFormatted.join(', ')
  }
}

export function formatCitation(
  pub: Publication,
  style: CitationStyle,
  _index: number,
  boldNames: string[],
): string {
  const authorStr = authorListForStyle(pub.authors, style, boldNames)
  const title = pub.title
  const journal = pub.journal
  const year = pub.year || ''
  const doiLink = pub.doi ? `https://doi.org/${pub.doi}` : ''

  switch (style) {
    case 'vancouver': {
      // Authors. Title. Journal. Year. doi:
      const parts = [
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
    .replace(/<\/?strong>/g, '')
    .replace(/<\/?u>/g, '')
    .replace(/<\/?em>/g, '')
    .replace(/<a[^>]*>/g, '')
    .replace(/<\/a>/g, '')
}
