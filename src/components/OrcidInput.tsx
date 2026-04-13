import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'
import { parseOrcidInput } from '@/api/orcid-parser'
import { CITATION_STYLES, type CitationStyle, type OrcidEntry, type YearRange, type SortOrder } from '@/types'

interface OrcidInputProps {
  onSubmit: (entries: OrcidEntry[], yearRange: YearRange | undefined, style: CitationStyle, sort: SortOrder) => void
  isLoading: boolean
}

export function OrcidInput({ onSubmit, isLoading }: OrcidInputProps) {
  const [text, setText] = useState('')
  const [entries, setEntries] = useState<OrcidEntry[]>([])
  const lastYear = (new Date().getFullYear() - 1).toString()
  const [yearFrom, setYearFrom] = useState(lastYear)
  const [yearTo, setYearTo] = useState(lastYear)
  const [style, setStyle] = useState<CitationStyle>('vancouver')
  const [sort, setSort] = useState<SortOrder>('date')

  const handleRemove = (orcidId: string) => {
    setEntries(prev => prev.filter(e => e.orcidId !== orcidId))
  }

  const handleNameEdit = (orcidId: string, newName: string) => {
    setEntries(prev =>
      prev.map(e => e.orcidId === orcidId ? { ...e, displayName: newName } : e),
    )
  }

  const handleSubmit = () => {
    // Auto-parse any remaining text in the textarea
    let allEntries = [...entries]
    if (text.trim()) {
      const parsed = parseOrcidInput(text)
      const existing = new Set(allEntries.map(e => e.orcidId))
      const newEntries = parsed.filter(e => !existing.has(e.orcidId))
      allEntries = [...allEntries, ...newEntries]
      setEntries(allEntries)
      setText('')
    }

    if (allEntries.length === 0) return
    const from = yearFrom ? parseInt(yearFrom) : undefined
    const to = yearTo ? parseInt(yearTo) : undefined
    const yearRange = (from || to) ? { from, to } : undefined
    onSubmit(allEntries, yearRange, style, sort)
  }

  // Live-parse to show preview badges
  const previewEntries = text.trim() ? parseOrcidInput(text) : []
  const existingIds = new Set(entries.map(e => e.orcidId))
  const newPreview = previewEntries.filter(e => !existingIds.has(e.orcidId))

  return (
    <Card>
      <CardHeader>
        <CardTitle>ORCID Publication List Generator</CardTitle>
        <CardDescription>
          Enter ORCID IDs to generate a formatted publication list.
          Paste IDs, URLs, or copy from Excel (name + ID per row).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orcid-input">ORCID IDs</Label>
          <Textarea
            id="orcid-input"
            placeholder={`Paste ORCID IDs here, then click Generate:\nYuki Furukawa  https://orcid.org/0000-0003-1317-0220\n0000-0002-4573-7732`}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
          />
          {newPreview.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground py-0.5">Detected:</span>
              {newPreview.map(e => (
                <Badge key={e.orcidId} variant="outline" className="text-xs">
                  {e.displayName} ({e.orcidId})
                </Badge>
              ))}
            </div>
          )}
        </div>

        {entries.length > 0 && (
          <div className="space-y-2">
            <Label>Added Members ({entries.length})</Label>
            <div className="flex flex-wrap gap-2">
              {entries.map(entry => (
                <Badge key={entry.orcidId} variant="secondary" className="gap-1 py-1 pl-2 pr-1">
                  <input
                    type="text"
                    value={entry.displayName}
                    onChange={e => handleNameEdit(entry.orcidId, e.target.value)}
                    className="bg-transparent border-none outline-none text-sm max-w-32"
                    title={entry.orcidId}
                  />
                  <span className="text-muted-foreground text-xs">{entry.orcidId}</span>
                  <button
                    onClick={() => handleRemove(entry.orcidId)}
                    className="ml-1 hover:text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="year-from">Year From</Label>
            <Input
              id="year-from"
              type="number"
              value={yearFrom}
              onChange={e => setYearFrom(e.target.value)}
              placeholder="e.g. 2020"
              min={1900}
              max={2100}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="year-to">Year To</Label>
            <Input
              id="year-to"
              type="number"
              value={yearTo}
              onChange={e => setYearTo(e.target.value)}
              placeholder="e.g. 2025"
              min={1900}
              max={2100}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Citation Style</Label>
            <Select value={style} onValueChange={v => setStyle(v as CitationStyle)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CITATION_STYLES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Sort By</Label>
            <Select value={sort} onValueChange={v => setSort(v as SortOrder)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Publication Date</SelectItem>
                <SelectItem value="first-author">First Author</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={(entries.length === 0 && newPreview.length === 0) || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Fetching...' : 'Generate List'}
        </Button>
      </CardContent>
    </Card>
  )
}
