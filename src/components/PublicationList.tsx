import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Copy, Check } from 'lucide-react'
import type { PipelineResult } from '@/api/pipeline'
import type { CitationStyle, PublicationCategory } from '@/types'
import { CATEGORY_LABELS } from '@/types'
import { formatCitation, formatPlainText } from '@/api/formatter'

interface PublicationListProps {
  result: PipelineResult
  style: CitationStyle
}

export function PublicationList({ result, style }: PublicationListProps) {
  const [copied, setCopied] = useState(false)

  const boldNames = result.boldNames

  const categories: PublicationCategory[] = ['original', 'preprint', 'letter', 'editorial', 'other']
  const nonEmptyCategories = categories.filter(cat => result.categorized[cat].length > 0)

  const handleCopy = async () => {
    // Build HTML (rich text) — <ol><li> for auto-renumbering in Word/Docs
    const htmlParts: string[] = []

    if (result.members.length > 0) {
      htmlParts.push('<p><b>Members</b></p><ul>')
      for (const m of result.members) {
        const name = m.orcidName ?? m.displayName
        htmlParts.push(`<li>${name} (<a href="https://orcid.org/${m.orcidId}">${m.orcidId}</a>)</li>`)
      }
      htmlParts.push('</ul>')
    }

    for (const cat of nonEmptyCategories) {
      const pubs = result.categorized[cat]
      htmlParts.push(`<p><b>${CATEGORY_LABELS[cat]} (${pubs.length})</b></p><ol>`)
      for (const pub of pubs) {
        const citation = formatCitation(pub, style, 0, boldNames)
        const pmidHtml = pub.pmid
          ? ` PMID: <a href="https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}">${pub.pmid}</a>`
          : ''
        htmlParts.push(`<li>${citation}${pmidHtml}</li>`)
      }
      htmlParts.push('</ol>')
    }

    const html = htmlParts.join('')

    // Build plain text fallback
    const textLines: string[] = []
    if (result.members.length > 0) {
      textLines.push('Members')
      for (const m of result.members) {
        const name = m.orcidName ?? m.displayName
        textLines.push(`${name} (https://orcid.org/${m.orcidId})`)
      }
      textLines.push('')
    }
    for (const cat of nonEmptyCategories) {
      const pubs = result.categorized[cat]
      textLines.push(`${CATEGORY_LABELS[cat]} (${pubs.length})`)
      for (let i = 0; i < pubs.length; i++) {
        textLines.push(`${i + 1}. ${formatPlainText(pubs[i], style, i + 1, boldNames)}`)
      }
      textLines.push('')
    }
    const plainText = textLines.join('\n')

    // Write both HTML and plain text to clipboard
    try {
      const blob = new Blob([html], { type: 'text/html' })
      const textBlob = new Blob([plainText], { type: 'text/plain' })
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob,
        }),
      ])
    } catch {
      // Fallback for iframe or restricted contexts: copy rich text via execCommand
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'fixed'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)
      const range = document.createRange()
      range.selectNodeContents(tempDiv)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      document.execCommand('copy')
      sel?.removeAllRanges()
      document.body.removeChild(tempDiv)
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalCount = result.publications.length

  return (
    <div className="space-y-4">
      {/* Member list */}
      {result.members.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Members
              <Badge variant="secondary">{result.members.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {result.members.map(m => (
                <li key={m.orcidId} className="flex items-center gap-2">
                  <span className="font-medium">{m.orcidName ?? m.displayName}</span>
                  <a
                    href={`https://orcid.org/${m.orcidId}`}
                    target="_blank"
                    rel="noopener"
                    className="text-xs text-muted-foreground underline"
                  >
                    {m.orcidId}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            Results
          </h2>
          <Badge variant="outline">{totalCount} publications</Badge>
        </div>
        <Button onClick={handleCopy} variant="outline" size="sm" className="gap-2">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy All'}
        </Button>
      </div>

      {result.errors.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <ul className="text-sm text-destructive-foreground space-y-1">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {nonEmptyCategories.map(cat => {
        const pubs = result.categorized[cat]

        return (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {CATEGORY_LABELS[cat]}
                <Badge variant="secondary">{pubs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm list-decimal list-inside">
                {pubs.map((pub, i) => (
                  <li key={pub.doi ?? pub.title} className="leading-relaxed">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: formatCitation(pub, style, i + 1, boldNames),
                      }}
                    />
                    {pub.pmid && (
                      <span className="text-xs text-muted-foreground ml-1">
                        PMID: <a
                          href={`https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}`}
                          target="_blank"
                          rel="noopener"
                          className="underline"
                        >
                          {pub.pmid}
                        </a>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
            {cat !== nonEmptyCategories[nonEmptyCategories.length - 1] && <Separator />}
          </Card>
        )
      })}
    </div>
  )
}
