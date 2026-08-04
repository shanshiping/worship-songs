export const MIN_SHEET_ZOOM = 0.5
export const MAX_SHEET_ZOOM = 3
export const SHEET_ZOOM_STEP = 0.25
export const DEFAULT_SHEET_ZOOM = 1

export function clampSheetZoom(zoom: number): number {
  return Math.min(MAX_SHEET_ZOOM, Math.max(MIN_SHEET_ZOOM, zoom))
}

export function stepSheetZoom(zoom: number, direction: 'in' | 'out'): number {
  const delta = direction === 'in' ? SHEET_ZOOM_STEP : -SHEET_ZOOM_STEP
  return clampSheetZoom(Number((zoom + delta).toFixed(2)))
}

export function formatSheetZoom(zoom: number): string {
  return `${Math.round(zoom * 100)}%`
}

export function isPdfSheetPath(path: string): boolean {
  return path.toLowerCase().includes('.pdf')
}

export function getSheetAbsoluteUrl(path: string, origin: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const base = origin.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function buildSheetImagePrintHtml(imageUrl: string, title: string): string {
  const safeTitle = title.replace(/[<>&"]/g, '')
  const safeUrl = imageUrl.replace(/"/g, '&quot;')
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      @page { margin: 12mm; }
      html, body { margin: 0; padding: 0; }
      body {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        min-height: 100vh;
        background: #fff;
      }
      img {
        max-width: 100%;
        height: auto;
        object-fit: contain;
      }
    </style>
  </head>
  <body>
    <img src="${safeUrl}" alt="${safeTitle}" />
    <script>
      window.addEventListener('load', function () {
        window.focus();
        window.print();
      });
    </script>
  </body>
</html>`
}

export type PrintSheetMusicOptions = {
  path: string
  origin: string
  title: string
  openWindow?: (url: string, target: string, features?: string) => Window | null
}

export function printSheetMusic(options: PrintSheetMusicOptions): void {
  const { path, origin, title, openWindow = window.open.bind(window) } = options
  const absoluteUrl = getSheetAbsoluteUrl(path, origin)

  if (isPdfSheetPath(path)) {
    const win = openWindow(absoluteUrl, '_blank', 'noopener,noreferrer')
    if (!win) {
      throw new Error('popup_blocked')
    }
    win.addEventListener('load', () => {
      globalThis.setTimeout(() => {
        try {
          win.focus()
          win.print()
        } catch {
          // Browser may block programmatic print on cross-document PDF viewers.
        }
      }, 500)
    })
    return
  }

  const win = openWindow('', '_blank', 'noopener,noreferrer')
  if (!win) {
    throw new Error('popup_blocked')
  }
  win.document.open()
  win.document.write(buildSheetImagePrintHtml(absoluteUrl, title))
  win.document.close()
}
