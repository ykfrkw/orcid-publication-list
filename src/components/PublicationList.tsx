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
    const lines: string[] = []
    let globalIndex = 1

    for (const cat of nonEmptyCategories) {
      const pubs = result.categorized[cat]
      lines.push(`\n${CATEGORY_LABELS[cat]} (${pubs.length})`)
      lines.push('─'.repeat(40))
      for (const pub of pubs) {
        lines.push(formatPlainText(pub, style, globalIndex, boldNames))
        globalIndex++
      }
      lines.push('')
    }

    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalCount = result.publications.length

  return (
    <div className="space-y-4">
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
        // Calculate the starting index for this category
        let startIndex = 1
        for (const prevCat of nonEmptyCategories) {
          if (prevCat === cat) break
          startIndex += result.categorized[prevCat].length
        }

        return (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {CATEGORY_LABELS[cat]}
                <Badge variant="secondary">{pubs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm list-none">
                {pubs.map((pub, i) => (
                  <li key={pub.doi ?? pub.title}>
                    <div
                      className="leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: formatCitation(pub, style, startIndex + i, boldNames),
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
