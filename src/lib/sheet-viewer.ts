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
      (function () {
        var img = document.querySelector('img');
        function doPrint() {
          window.focus();
          window.print();
        }
        if (!img) return;
        if (img.complete && img.naturalWidth > 0) {
          doPrint();
          return;
        }
        img.addEventListener('load', doPrint, { once: true });
        img.addEventListener('error', function () {
          document.body.textContent = 'Failed to load sheet image for printing.';
        }, { once: true });
      })();
    </script>
  </body>
</html>`
}

export function buildSheetPdfPrintHtml(pdfUrl: string, title: string): string {
  const safeTitle = title.replace(/[<>&"]/g, '')
  const safeUrl = pdfUrl.replace(/"/g, '&quot;')
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      @page { margin: 0; }
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
      embed { display: block; width: 100%; height: 100vh; border: 0; }
    </style>
  </head>
  <body>
    <embed src="${safeUrl}" type="application/pdf" />
    <script>
      window.addEventListener('load', function () {
        window.setTimeout(function () {
          window.focus();
          window.print();
        }, 800);
      });
    </script>
  </body>
</html>`
}

export type PrintSheetMusicOptions = {
  path: string
  origin: string
  title: string
  doc?: Pick<Document, 'createElement' | 'body'>
}

function buildSheetPrintHtml(path: string, absoluteUrl: string, title: string): string {
  return isPdfSheetPath(path)
    ? buildSheetPdfPrintHtml(absoluteUrl, title)
    : buildSheetImagePrintHtml(absoluteUrl, title)
}

export function printSheetMusic(options: PrintSheetMusicOptions): void {
  const { path, origin, title, doc = document } = options
  const absoluteUrl = getSheetAbsoluteUrl(path, origin)
  const html = buildSheetPrintHtml(path, absoluteUrl, title)

  const iframe = doc.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  doc.body.appendChild(iframe)

  const frameDoc = iframe.contentDocument ?? iframe.contentWindow?.document
  if (!frameDoc) {
    iframe.remove()
    throw new Error('print_frame_unavailable')
  }

  frameDoc.open()
  frameDoc.write(html)
  frameDoc.close()

  const frameWindow = iframe.contentWindow
  if (frameWindow) {
    frameWindow.addEventListener('afterprint', () => iframe.remove(), { once: true })
  }
  globalThis.setTimeout(() => iframe.remove(), 120_000)
}
