import { useState, useEffect } from 'react'
import { OrcidInput } from '@/components/OrcidInput'
import { PublicationList } from '@/components/PublicationList'
import { Progress } from '@/components/ui/progress'
import { runPipeline, type FetchProgress, type PipelineResult } from '@/api/pipeline'
import type { CitationStyle, OrcidEntry, YearRange, SortOrder } from '@/types'

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<FetchProgress | null>(null)
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [style, setStyle] = useState<CitationStyle>('vancouver')

  const handleSubmit = async (
    newEntries: OrcidEntry[],
    yearRange: YearRange | undefined,
    citStyle: CitationStyle,
    sortOrder: SortOrder,
  ) => {
    setIsLoading(true)
    setResult(null)
    setStyle(citStyle)
    setProgress({ stage: 'orcid', message: 'Starting...', percent: 0 })

    try {
      const pipelineResult = await runPipeline(newEntries, yearRange, sortOrder, setProgress)
      setResult(pipelineResult)
    } catch (e) {
      setResult({
        publications: [],
        categorized: { original: [], preprint: [], letter: [], editorial: [], other: [] },
        boldNames: [],
        members: [],
        errors: [`Pipeline failed: ${e}`],
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Notify parent window of height changes for iframe auto-resize
  useEffect(() => {
    if (window.parent === window) return // not in iframe
    const root = document.documentElement
    const observer = new ResizeObserver(() => {
      window.parent.postMessage(
        { type: 'orcid-pub-list-resize', height: root.scrollHeight },
        '*',
      )
    })
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
        <OrcidInput onSubmit={handleSubmit} isLoading={isLoading} />

        {isLoading && progress && (
          <div className="space-y-2">
            <Progress value={progress.percent} className="h-2" />
            <p className="text-sm text-muted-foreground">{progress.message}</p>
          </div>
        )}

        {result && !isLoading && (
          <PublicationList result={result} style={style} />
        )}

        <footer className="text-xs text-muted-foreground space-y-2 pt-4 pb-8 border-t">
          <p>
            <strong>Disclaimer:</strong> This tool retrieves publication data from{' '}
            <a href="https://orcid.org" target="_blank" rel="noopener" className="underline">ORCID</a>{' '}
            and enriches it using{' '}
            <a href="https://openalex.org" target="_blank" rel="noopener" className="underline">OpenAlex</a>.
            Please note the following limitations:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              Publication type classification (Original Article, Letter, Editorial, etc.) is based on
              OpenAlex metadata, which may not always be accurate. Some publications may be miscategorized.
              Please review and correct the output manually if needed.
            </li>
            <li>
              This tool can only list publications that are registered in the author's ORCID profile.
              If a publication is not linked to the ORCID record, it will not appear in the results.
              Conversely, if incorrect entries exist in the ORCID profile, they will be included.
            </li>
            <li>
              For F1000Research and Wellcome Open Research, peer review approval status is checked
              via Crossref metadata. Articles without confirmed approval are listed as Preprints.
            </li>
          </ul>
        </footer>
      </div>
    </div>
  )
}

export default App
