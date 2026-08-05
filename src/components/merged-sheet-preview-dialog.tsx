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
import {
  clampSheetZoom,
  DEFAULT_SHEET_ZOOM,
  formatSheetZoom,
  printSheetMusic,
  stepSheetZoom,
} from '@/lib/sheet-viewer'
import {
  Download,
  Maximize2,
  Minimize2,
  Printer,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

type MergedSheetPreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  blobUrl: string | null
  filename: string
}

export function MergedSheetPreviewDialog({
  open,
  onOpenChange,
  blobUrl,
  filename,
}: MergedSheetPreviewDialogProps) {
  const { t } = useI18n()
  const [zoom, setZoom] = useState(DEFAULT_SHEET_ZOOM)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const viewerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setZoom(DEFAULT_SHEET_ZOOM)
      setIsFullscreen(false)
    }
  }, [open])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (!viewerRef.current) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await viewerRef.current.requestFullscreen()
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error)
    }
  }, [])

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    setZoom((current) =>
      clampSheetZoom(current + (event.deltaY < 0 ? 0.1 : -0.1)),
    )
  }, [])

  const handlePrint = useCallback(() => {
    if (!blobUrl) return
    try {
      printSheetMusic({
        path: blobUrl,
        origin: window.location.origin,
        title: t('sheets.previewTitle'),
      })
    } catch (error) {
      console.error('Print merged sheet PDF failed:', error)
      toast.error(t('sheets.printFailed'))
    }
  }, [blobUrl, t])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t('sheets.previewTitle')}</DialogTitle>
        </DialogHeader>

        {blobUrl ? (
          <div
            ref={viewerRef}
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-muted/30"
          >
            <div className="flex flex-wrap items-center gap-2 border-b bg-background/80 p-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setZoom((current) => stepSheetZoom(current, 'out'))}
                aria-label={t('songs.zoomOut')}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="min-w-14 text-center text-sm font-medium tabular-nums">
                {formatSheetZoom(zoom)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setZoom((current) => stepSheetZoom(current, 'in'))}
                aria-label={t('songs.zoomIn')}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setZoom(DEFAULT_SHEET_ZOOM)}
                aria-label={t('songs.resetZoom')}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => void toggleFullscreen()}
                aria-label={isFullscreen ? t('songs.exitFullscreen') : t('songs.fullscreen')}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={handlePrint}
                aria-label={t('sheets.print')}
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>

            <div className="min-h-[60vh] flex-1 overflow-auto" onWheel={handleWheel}>
              <div className="flex min-h-full w-full items-start justify-center p-4">
                <div
                  className="h-[70vh] w-full max-w-full"
                  style={
                    zoom === DEFAULT_SHEET_ZOOM
                      ? undefined
                      : {
                          transform: `scale(${zoom})`,
                          transformOrigin: 'top center',
                        }
                  }
                >
                  <embed
                    src={`${blobUrl}#view=FitH`}
                    type="application/pdf"
                    title={t('sheets.previewTitle')}
                    className="h-full w-full border-0"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-lg"
            disabled={!blobUrl}
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            {t('sheets.print')}
          </Button>
          <a
            href={blobUrl ?? undefined}
            download={filename}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            aria-disabled={!blobUrl}
          >
            <Download className="h-4 w-4" />
            {t('sheets.download')}
          </a>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
