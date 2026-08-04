import { describe, expect, it, vi } from 'vitest'
import {
  buildSheetImagePrintHtml,
  buildSheetPdfPrintHtml,
  clampSheetZoom,
  DEFAULT_SHEET_ZOOM,
  formatSheetZoom,
  getSheetAbsoluteUrl,
  isPdfSheetPath,
  MAX_SHEET_ZOOM,
  MIN_SHEET_ZOOM,
  printSheetMusic,
  stepSheetZoom,
} from '@/lib/sheet-viewer'

describe('sheet-viewer', () => {
  it('clamps zoom within bounds', () => {
    expect(clampSheetZoom(0.1)).toBe(MIN_SHEET_ZOOM)
    expect(clampSheetZoom(5)).toBe(MAX_SHEET_ZOOM)
    expect(clampSheetZoom(1)).toBe(DEFAULT_SHEET_ZOOM)
  })

  it('steps zoom in and out', () => {
    expect(stepSheetZoom(1, 'in')).toBe(1.25)
    expect(stepSheetZoom(1, 'out')).toBe(0.75)
    expect(stepSheetZoom(MIN_SHEET_ZOOM, 'out')).toBe(MIN_SHEET_ZOOM)
    expect(stepSheetZoom(MAX_SHEET_ZOOM, 'in')).toBe(MAX_SHEET_ZOOM)
  })

  it('formats zoom as percentage', () => {
    expect(formatSheetZoom(1)).toBe('100%')
    expect(formatSheetZoom(1.5)).toBe('150%')
  })

  it('detects pdf sheet paths', () => {
    expect(isPdfSheetPath('/uploads/sheets/foo.PDF')).toBe(true)
    expect(isPdfSheetPath('/uploads/sheets/foo.png')).toBe(false)
  })

  it('builds absolute sheet urls', () => {
    expect(getSheetAbsoluteUrl('/uploads/sheets/a.png', 'http://localhost:3000')).toBe(
      'http://localhost:3000/uploads/sheets/a.png',
    )
    expect(getSheetAbsoluteUrl('https://cdn.example/a.pdf', 'http://localhost:3000')).toBe(
      'https://cdn.example/a.pdf',
    )
  })

  it('builds image print html with escaped title', () => {
    const html = buildSheetImagePrintHtml(
      'http://localhost:3000/uploads/sheets/a.png',
      'Sheet <preview>',
    )
    expect(html).toContain('http://localhost:3000/uploads/sheets/a.png')
    expect(html).toContain('Sheet preview')
    expect(html).not.toContain('<preview>')
    expect(html).toContain('img.addEventListener(\'load\'')
  })

  it('builds pdf print html with embed', () => {
    const html = buildSheetPdfPrintHtml(
      'http://localhost:3000/uploads/sheets/a.pdf',
      'Sheet',
    )
    expect(html).toContain('<embed src="http://localhost:3000/uploads/sheets/a.pdf"')
    expect(html).toContain('window.print()')
  })

  it('prints sheets via hidden iframe', () => {
    const write = vi.fn()
    const close = vi.fn()
    const open = vi.fn()
    const remove = vi.fn()
    const addEventListener = vi.fn()
    const appendChild = vi.fn()

    const iframe = {
      style: {},
      setAttribute: vi.fn(),
      contentDocument: { open, write, close },
      contentWindow: { addEventListener },
      remove,
    }

    const doc = {
      createElement: vi.fn(() => iframe),
      body: { appendChild },
    }

    printSheetMusic({
      path: '/uploads/sheets/a.png',
      origin: 'http://localhost:3000',
      title: 'Sheet',
      doc: doc as unknown as Document,
    })

    expect(doc.createElement).toHaveBeenCalledWith('iframe')
    expect(appendChild).toHaveBeenCalledWith(iframe)
    expect(open).toHaveBeenCalled()
    expect(write).toHaveBeenCalledWith(expect.stringContaining('/uploads/sheets/a.png'))
    expect(close).toHaveBeenCalled()
  })
})
