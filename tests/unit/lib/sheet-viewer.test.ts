import { describe, expect, it } from 'vitest'
import {
  clampSheetZoom,
  DEFAULT_SHEET_ZOOM,
  formatSheetZoom,
  isPdfSheetPath,
  MAX_SHEET_ZOOM,
  MIN_SHEET_ZOOM,
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
})
