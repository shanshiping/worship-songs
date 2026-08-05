'use client'

import { ArrowDown, ArrowUp, CheckCircle, FileText, Loader2, Plus, X } from 'lucide-react'
import { useId } from 'react'
import { useI18n } from '@/components/providers/i18n-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type SheetMusicPageFile = {
  path: string
  name: string
  size: number
  type: string
}

type SheetMusicPagesEditorProps = {
  pages: SheetMusicPageFile[]
  uploading?: boolean
  onChange: (pages: SheetMusicPageFile[]) => void
  onUploadFiles: (files: File[]) => Promise<SheetMusicPageFile[]>
}

function formatFileSize(bytes: number): string {
  if (bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function SheetMusicPagesEditor({
  pages,
  uploading = false,
  onChange,
  onUploadFiles,
}: SheetMusicPagesEditorProps) {
  const { t } = useI18n()
  const inputId = useId()

  const movePage = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= pages.length) return
    const next = [...pages]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const removePage = (index: number) => {
    onChange(pages.filter((_, i) => i !== index))
  }

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return

    const uploaded = await onUploadFiles(files)
    if (uploaded.length > 0) {
      onChange([...pages, ...uploaded])
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{t('songs.sheetFile')}</Label>

      {pages.length > 0 ? (
        <div className="space-y-2">
          {pages.map((page, index) => (
            <div
              key={`${page.path}-${index}`}
              className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3"
            >
              <span className="w-5 shrink-0 text-center text-xs font-medium text-green-700">
                {index + 1}
              </span>
              <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-green-900">{page.name}</p>
                {page.size > 0 && (
                  <p className="text-xs text-green-600">{formatFileSize(page.size)}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === 0}
                  onClick={() => movePage(index, -1)}
                  aria-label={t('sheets.moveUp')}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === pages.length - 1}
                  onClick={() => movePage(index, 1)}
                  aria-label={t('sheets.moveDown')}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removePage(index)}
                  aria-label={t('sheets.remove')}
                >
                  <X className="h-4 w-4 text-green-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <Input
          id={inputId}
          type="file"
          accept="image/*,.pdf"
          multiple
          onChange={(event) => void handleFilesSelected(event)}
          className="hidden"
          disabled={uploading}
        />
        <label
          htmlFor={inputId}
          className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-5 transition-colors hover:border-primary hover:bg-gray-50"
        >
          {uploading ? (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('songs.uploading')}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2 text-muted-foreground">
              {pages.length > 0 ? (
                <>
                  <Plus className="h-6 w-6" />
                  <span className="text-sm">{t('songs.addSheetPage')}</span>
                </>
              ) : (
                <>
                  <FileText className="h-8 w-8" />
                  <span className="text-sm">{t('songs.clickUploadSheet')}</span>
                  <span className="text-xs">{t('songs.dropSheetHintMulti')}</span>
                </>
              )}
            </div>
          )}
        </label>
      </div>
    </div>
  )
}
