import type { OrcidEntry } from '@/types'

/**
 * Parse ORCID IDs from free-text input.
 * Supports:
 * - Standard: 0000-0002-4573-7732
 * - URL: https://orcid.org/0000-0002-4573-7732
 * - With name: "Stefan Leucht 0000-0002-4573-7732"
 * - Tab-separated (Excel copy-paste): "Stefan Leucht\t0000-0002-4573-7732"
 * - Comma-separated
 * - One per line
 * - Mixed formats
 */

const ORCID_REGEX = /(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/gi

export function parseOrcidInput(text: string): OrcidEntry[] {
  const entries: OrcidEntry[] = []
  const seen = new Set<string>()

  // Split by newlines to process line by line
  const lines = text.split(/\n/).filter(l => l.trim())

  for (const line of lines) {
    // A line might contain multiple ORCID IDs (comma-separated)
    const segments = line.split(/[,;]/).map(s => s.trim()).filter(Boolean)

    for (const segment of segments) {
      const matches = segment.match(ORCID_REGEX)
      if (!matches) continue

      for (const orcidId of matches) {
        const normalized = orcidId.toUpperCase()
        if (seen.has(normalized)) continue
        seen.add(normalized)

        // Extract name: everything before the ORCID ID pattern or URL
        const beforeId = segment
          .replace(/https?:\/\/orcid\.org\//gi, '')
          .replace(ORCID_REGEX, '')
          .replace(/[:\t]+/g, ' ')
          .trim()

        entries.push({
          orcidId: normalized,
          displayName: beforeId || normalized,
        })
      }
    }
  }

  return entries
}
