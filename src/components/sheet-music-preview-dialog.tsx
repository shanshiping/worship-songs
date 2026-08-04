'use client'

import { useI18n } from '@/components/providers/i18n-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download } from 'lucide-react'

function isPdfPath(path: string): boolean {
  return path.toLowerCase().includes('.pdf')
}

type SheetMusicPreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  path: string | null
}

export function SheetMusicPreviewDialog({
  open,
  onOpenChange,
  path,
}: SheetMusicPreviewDialogProps) {
  const { t } = useI18n()

  if (!path) return null

  const pdf = isPdfPath(path)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('songs.sheetPreview')}</DialogTitle>
        </DialogHeader>

        <div className="min-h-[60vh] flex-1 overflow-auto rounded-lg border bg-muted/30">
          {pdf ? (
            <iframe
              title={t('songs.sheetPreview')}
              src={path}
              className="h-[70vh] w-full border-0"
            />
          ) : (
            <img
              src={path}
              alt={t('songs.sheetFile')}
              className="mx-auto max-h-[70vh] w-auto object-contain p-2"
            />
          )}
        </div>

        <DialogFooter>
          <a
            href={path}
            download
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            {t('songs.downloadSheet')}
          </a>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
