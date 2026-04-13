import { useState } from 'react'
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
  const [entries, setEntries] = useState<OrcidEntry[]>([])

  const handleSubmit = async (
    newEntries: OrcidEntry[],
    yearRange: YearRange | undefined,
    citStyle: CitationStyle,
    sortOrder: SortOrder,
  ) => {
    setIsLoading(true)
    setResult(null)
    setStyle(citStyle)
    setEntries(newEntries)
    setProgress({ stage: 'orcid', message: 'Starting...', percent: 0 })

    try {
      const pipelineResult = await runPipeline(newEntries, yearRange, sortOrder, setProgress)
      setResult(pipelineResult)
    } catch (e) {
      setResult({
        publications: [],
        categorized: { original: [], review: [], letter: [], editorial: [], other: [] },
        errors: [`Pipeline failed: ${e}`],
      })
    } finally {
      setIsLoading(false)
    }
  }

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
          <PublicationList result={result} style={style} entries={entries} />
        )}
      </div>
    </div>
  )
}

export default App
