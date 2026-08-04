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
  isPdfSheetPath,
  stepSheetZoom,
} from '@/lib/sheet-viewer'
import {
  Download,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

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

  if (!path) return null

  const pdf = isPdfSheetPath(path)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t('songs.sheetPreview')}</DialogTitle>
        </DialogHeader>

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
            <span className="text-xs text-muted-foreground">{t('songs.zoomHint')}</span>
          </div>

          <div
            className="min-h-[60vh] flex-1 overflow-auto"
            onWheel={handleWheel}
          >
            <div className="flex min-h-full w-full items-start justify-center p-4">
              <div
                className="max-w-full"
                style={
                  zoom === DEFAULT_SHEET_ZOOM
                    ? undefined
                    : {
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top center',
                      }
                }
              >
                {pdf ? (
                  <iframe
                    title={t('songs.sheetPreview')}
                    src={path}
                    className="h-[70vh] w-full max-w-full border-0"
                  />
                ) : (
                  <img
                    src={path}
                    alt={t('songs.sheetFile')}
                    className="h-auto max-h-[70vh] w-auto max-w-full object-contain"
                    draggable={false}
                  />
                )}
              </div>
            </div>
          </div>
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
