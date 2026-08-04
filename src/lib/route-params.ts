/** Reserved `/songs/[id]` segments — use dedicated routes instead. */
export const RESERVED_SONG_IDS = new Set(['upload', 'new'])

export const SONG_UPLOAD_PATH = '/song-upload'

export function getRouteParamId(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] ?? ''
  return ''
}

export function isSongDetailId(id: string): boolean {
  return id.length > 0 && !RESERVED_SONG_IDS.has(id)
}
