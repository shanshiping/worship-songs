import { readFile } from 'fs/promises'
import { join } from 'path'

const IMAGE_PATH_PATTERN = /\.(jpe?g|png|gif|webp)$/i

export function isImageAssetPath(path: string | null | undefined): boolean {
  if (!path?.trim()) return false
  return IMAGE_PATH_PATTERN.test(path.trim())
}

export function pickSongBackgroundPath(input: {
  pptBackground?: string | null
  coverImage?: string | null
  sheetMusic?: string | null
}): string | null {
  if (isImageAssetPath(input.pptBackground)) return input.pptBackground!.trim()
  if (isImageAssetPath(input.coverImage)) return input.coverImage!.trim()
  if (isImageAssetPath(input.sheetMusic)) return input.sheetMusic!.trim()
  return null
}

function mimeTypeForPath(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

export function resolvePublicAssetPath(webPath: string): string {
  const normalized = webPath.startsWith('/') ? webPath.slice(1) : webPath
  return join(process.cwd(), 'public', normalized)
}

/** Load a public /uploads/... image as a base64 data URI for pptxgenjs. */
export async function loadSongBackgroundImage(
  webPath: string | null | undefined
): Promise<string | null> {
  if (!isImageAssetPath(webPath)) return null

  try {
    const absolutePath = resolvePublicAssetPath(webPath!.trim())
    const buffer = await readFile(absolutePath)
    const mime = mimeTypeForPath(webPath!)
    return `${mime};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

export async function loadSongBackgroundImageForSong(input: {
  pptBackground?: string | null
  coverImage?: string | null
  sheetMusic?: string | null
}): Promise<string | null> {
  const assetPath = pickSongBackgroundPath(input)
  if (!assetPath) return null
  return loadSongBackgroundImage(assetPath)
}
