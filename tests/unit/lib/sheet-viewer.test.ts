import { describe, expect, it, vi } from 'vitest'
import {
  buildSheetImagePrintHtml,
  clampSheetZoom,
  DEFAULT_SHEET_ZOOM,
  formatSheetZoom,
  getSheetAbsoluteUrl,
  isPdfSheetPath,
  MAX_SHEET_ZOOM,
  MIN_SHEET_ZOOM,
  printSheetMusic,
  type PrintSheetMusicOptions,
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
  })

  it('prints image sheets in a new window', () => {
    const write = vi.fn()
    const close = vi.fn()
    const open = vi.fn(() => ({
      document: { open: vi.fn(), write, close },
      addEventListener: vi.fn(),
    }))

    printSheetMusic({
      path: '/uploads/sheets/a.png',
      origin: 'http://localhost:3000',
      title: 'Sheet',
      openWindow: open as unknown as PrintSheetMusicOptions['openWindow'],
    })

    expect(open).toHaveBeenCalledWith('', '_blank', 'noopener,noreferrer')
    expect(write).toHaveBeenCalled()
  })

  it('opens pdf sheets for printing', () => {
    const print = vi.fn()
    const addEventListener = vi.fn((event, handler) => {
      if (event === 'load') handler()
    })
    const open = vi.fn(() => ({
      addEventListener,
      focus: vi.fn(),
      print,
    }))

    vi.useFakeTimers()
    printSheetMusic({
      path: '/uploads/sheets/a.pdf',
      origin: 'http://localhost:3000',
      title: 'Sheet',
      openWindow: open as unknown as PrintSheetMusicOptions['openWindow'],
    })
    vi.runAllTimers()
    vi.useRealTimers()

    expect(open).toHaveBeenCalledWith(
      'http://localhost:3000/uploads/sheets/a.pdf',
      '_blank',
      'noopener,noreferrer',
    )
    expect(print).toHaveBeenCalled()
  })
})
