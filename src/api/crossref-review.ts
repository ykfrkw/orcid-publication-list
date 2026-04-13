/**
 * Check F1000Research / Wellcome Open Research peer review approval status
 * via Crossref assertion metadata.
 *
 * Crossref `assertion` array for these journals includes:
 *   { name: "referee-status", value: "Indexed" }  → approved
 *   { name: "referee-status", value: "Awaiting Peer Review" } → not yet approved
 *
 * The "Indexed" status means at least one reviewer approved the article,
 * making it a fully peer-reviewed publication rather than a preprint.
 */

const CROSSREF_BASE = 'https://api.crossref.org/works'
const MAILTO = 'orcid-pub-list@example.com'

interface CrossrefAssertion {
  name?: string
  value?: string
  label?: string
}

interface CrossrefResponse {
  message?: {
    assertion?: CrossrefAssertion[]
  }
}

/**
 * Returns true if the paper has been approved by peer reviewers.
 * For F1000Research/Wellcome, "Indexed" or individual review assertions
 * containing "approved" indicate approval.
 */
export async function checkPeerReviewApproval(doi: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${CROSSREF_BASE}/${encodeURIComponent(doi)}?mailto=${MAILTO}`,
      { headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return false
    const data: CrossrefResponse = await res.json()
    const assertions = data.message?.assertion ?? []

    // Check referee-status assertion
    for (const a of assertions) {
      if (a.name === 'referee-status') {
        const val = (a.value ?? '').toLowerCase()
        // "Indexed" = approved and indexed in databases
        if (val === 'indexed' || val.includes('approved')) {
          return true
        }
      }
      // Also check individual referee responses for "approved"
      if (a.name?.startsWith('referee-response')) {
        const val = (a.value ?? '').toLowerCase()
        if (val.includes('approved')) {
          return true
        }
      }
    }

    return false
  } catch {
    return false
  }
}

/**
 * Batch check peer review status for multiple DOIs.
 */
export async function batchCheckPeerReview(
  dois: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>()
  const BATCH_SIZE = 3
  const DELAY = 1100

  for (let i = 0; i < dois.length; i += BATCH_SIZE) {
    const batch = dois.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async doi => {
      const approved = await checkPeerReviewApproval(doi)
      results.set(doi.toLowerCase(), approved)
    })
    await Promise.all(promises)
    onProgress?.(Math.min(i + BATCH_SIZE, dois.length), dois.length)

    if (i + BATCH_SIZE < dois.length) {
      await new Promise(r => setTimeout(r, DELAY))
    }
  }

  return results
}
