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
