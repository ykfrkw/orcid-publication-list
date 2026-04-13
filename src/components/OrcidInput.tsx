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
import { CITATION_STYLES, type CitationStyle, type OrcidEntry } from '@/types'

interface OrcidInputProps {
  onSubmit: (entries: OrcidEntry[], year: number | undefined, style: CitationStyle) => void
  isLoading: boolean
}

export function OrcidInput({ onSubmit, isLoading }: OrcidInputProps) {
  const [text, setText] = useState('')
  const [entries, setEntries] = useState<OrcidEntry[]>([])
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [style, setStyle] = useState<CitationStyle>('vancouver')

  const handleParse = () => {
    const parsed = parseOrcidInput(text)
    // Merge with existing, avoiding duplicates
    setEntries(prev => {
      const existing = new Set(prev.map(e => e.orcidId))
      const newEntries = parsed.filter(e => !existing.has(e.orcidId))
      return [...prev, ...newEntries]
    })
    setText('')
  }

  const handleRemove = (orcidId: string) => {
    setEntries(prev => prev.filter(e => e.orcidId !== orcidId))
  }

  const handleNameEdit = (orcidId: string, newName: string) => {
    setEntries(prev =>
      prev.map(e => e.orcidId === orcidId ? { ...e, displayName: newName } : e),
    )
  }

  const handleSubmit = () => {
    if (entries.length === 0) return
    const yearNum = year ? parseInt(year) : undefined
    onSubmit(entries, yearNum && !isNaN(yearNum) ? yearNum : undefined, style)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleParse()
    }
  }

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
          <div className="flex gap-2">
            <Textarea
              id="orcid-input"
              placeholder={`Paste ORCID IDs here (one per line, or comma-separated):\n0000-0002-4573-7732\nStefan Leucht\thttps://orcid.org/0000-0002-4573-7732\nJohn Doe, 0000-0001-2345-6789`}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              className="flex-1"
            />
          </div>
          <Button onClick={handleParse} variant="secondary" size="sm" disabled={!text.trim()}>
            Add IDs
          </Button>
        </div>

        {entries.length > 0 && (
          <div className="space-y-2">
            <Label>Members ({entries.length})</Label>
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

        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="year-filter">Year</Label>
            <Input
              id="year-filter"
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              placeholder="All years"
              className="w-28"
              min={1900}
              max={2100}
            />
          </div>

          <div className="space-y-2">
            <Label>Citation Style</Label>
            <Select value={style} onValueChange={v => setStyle(v as CitationStyle)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CITATION_STYLES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} disabled={entries.length === 0 || isLoading}>
            {isLoading ? 'Fetching...' : 'Generate List'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
