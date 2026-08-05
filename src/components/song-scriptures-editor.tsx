'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2 } from 'lucide-react'

export type ScriptureDraft = {
  reference: string
  text: string
}

export type ScriptureItem = {
  id?: string
  reference: string
  text?: string | null
  order?: number
}

export function scripturesForSubmit(drafts: ScriptureDraft[]) {
  return drafts
    .map((d) => ({
      reference: d.reference.trim(),
      text: d.text.trim() ? d.text.trim() : null,
    }))
    .filter((d) => d.reference.length > 0)
}

export function draftsFromScriptures(
  scriptures: ScriptureItem[] | null | undefined
): ScriptureDraft[] {
  if (!scriptures?.length) return []
  return [...scriptures]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s) => ({
      reference: s.reference ?? '',
      text: s.text ?? '',
    }))
}

type EditorProps = {
  value: ScriptureDraft[]
  onChange: (next: ScriptureDraft[]) => void
  t: (key: string) => string
}

export function SongScripturesEditor({ value, onChange, t }: EditorProps) {
  const updateRow = (index: number, patch: Partial<ScriptureDraft>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>{t('songs.scriptures')}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => onChange([...value, { reference: '', text: '' }])}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t('songs.addScripture')}
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('songs.scripturesEmpty')}</p>
      ) : (
        <div className="space-y-4">
          {value.map((row, index) => (
            <div
              key={index}
              className="space-y-2 rounded-xl border p-3"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`scripture-ref-${index}`}>
                    {t('songs.scriptureReference')}
                  </Label>
                  <Input
                    id={`scripture-ref-${index}`}
                    value={row.reference}
                    onChange={(e) =>
                      updateRow(index, { reference: e.target.value })
                    }
                    placeholder={t('songs.scriptureReferencePlaceholder')}
                    className="rounded-xl input-focus"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-7 shrink-0"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  aria-label={t('songs.removeScripture')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`scripture-text-${index}`}>
                  {t('songs.scriptureText')}
                </Label>
                <Textarea
                  id={`scripture-text-${index}`}
                  value={row.text}
                  onChange={(e) => updateRow(index, { text: e.target.value })}
                  placeholder={t('songs.scriptureTextPlaceholder')}
                  rows={3}
                  className="rounded-xl input-focus"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type DisplayProps = {
  scriptures: ScriptureItem[] | null | undefined
  t: (key: string) => string
  className?: string
}

export function SongScripturesDisplay({
  scriptures,
  t,
  className,
}: DisplayProps) {
  if (!scriptures?.length) return null
  const ordered = [...scriptures].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  )

  return (
    <div className={className ?? 'space-y-3'}>
      <h3 className="text-sm font-medium text-muted-foreground">
        {t('songs.scriptures')}
      </h3>
      <div className="space-y-3">
        {ordered.map((item, index) => (
          <div
            key={item.id ?? `${item.reference}-${index}`}
            className="rounded-xl bg-muted/50 p-3"
          >
            <p className="font-medium">{item.reference}</p>
            {item.text ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {item.text}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
