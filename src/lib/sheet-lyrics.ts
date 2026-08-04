import { readFile } from 'fs/promises'
import path from 'path'
import { getLyricsOcrConfig } from '@/lib/lyrics-ocr-config'
import { extractLyricsFromSheet } from '@/lib/lyrics-ocr'

const SHEET_PREFIX = '/uploads/sheets/'

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
}

/** Resolve a public sheet path to an absolute file path, or null if unsafe/invalid. */
export function resolveSheetPath(rawPath: unknown): {
  absolutePath: string
  mimeType: string
} | null {
  if (typeof rawPath !== 'string') return null
  const trimmed = rawPath.trim()
  if (!trimmed.startsWith(SHEET_PREFIX)) return null
  if (trimmed.includes('..') || trimmed.includes('\\')) return null

  const relative = trimmed.slice(1)
  const fileName = path.basename(relative)
  if (!fileName || fileName !== relative.split('/').pop()) return null

  const ext = path.extname(fileName).toLowerCase()
  const mimeType = MIME_BY_EXT[ext]
  if (!mimeType) return null

  const absolutePath = path.join(process.cwd(), 'public', 'uploads', 'sheets', fileName)
  return { absolutePath, mimeType }
}

export async function readSheetBytes(sheetPath: string): Promise<Buffer> {
  const resolved = resolveSheetPath(sheetPath)
  if (!resolved) {
    throw new Error('无效的歌谱路径')
  }
  return readFile(resolved.absolutePath)
}

export async function tryExtractLyricsFromSheetPath(
  sheetPath: string,
): Promise<string | null> {
  const config = getLyricsOcrConfig()
  if (!config) return null

  const resolved = resolveSheetPath(sheetPath)
  if (!resolved) return null

  let bytes: Buffer
  try {
    bytes = await readFile(resolved.absolutePath)
  } catch {
    return null
  }

  try {
    const lyrics = await extractLyricsFromSheet({
      bytes,
      mimeType: resolved.mimeType,
      config,
    })
    return lyrics.trim() || null
  } catch (error) {
    console.error('Auto extract lyrics error:', error)
    return null
  }
}

/** Use provided lyrics when present; otherwise try extracting from sheet music. */
export async function resolveLyricsWithAutoExtract(
  sheetPath: string | null | undefined,
  lyrics: string | null | undefined,
): Promise<string | null> {
  const normalizedLyrics =
    typeof lyrics === 'string' ? lyrics.trim() || null : null
  if (normalizedLyrics) return normalizedLyrics
  if (!sheetPath) return null

  return tryExtractLyricsFromSheetPath(sheetPath)
}
