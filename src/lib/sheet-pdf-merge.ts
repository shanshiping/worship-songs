import { PDFDocument, PageSizes } from 'pdf-lib'
import sharp from 'sharp'

export type SheetMergeInput = {
  title: string
  sheetPath: string
  bytes: Buffer
  mimeType: string
}

export function findSongsWithoutSheet(
  songs: { title: string; sheetMusic: string | null }[],
): string[] {
  return songs.filter((song) => !song.sheetMusic?.trim()).map((song) => song.title)
}

export function filterSongsWithSheet<T extends { sheetMusic: string | null }>(
  songs: T[],
): T[] {
  return songs.filter((song) => Boolean(song.sheetMusic?.trim()))
}

async function embedImagePage(
  pdf: PDFDocument,
  bytes: Buffer,
  mimeType: string,
): Promise<void> {
  let imageBytes = bytes
  let embedMime = mimeType

  if (mimeType === 'image/gif' || mimeType === 'image/webp') {
    imageBytes = await sharp(bytes).png().toBuffer()
    embedMime = 'image/png'
  }

  const page = pdf.addPage(PageSizes.A4)
  const { width, height } = page.getSize()

  const image =
    embedMime === 'image/png'
      ? await pdf.embedPng(imageBytes)
      : await pdf.embedJpg(imageBytes)

  const scale = Math.min(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  const x = (width - drawWidth) / 2
  const y = (height - drawHeight) / 2

  page.drawImage(image, { x, y, width: drawWidth, height: drawHeight })
}

export async function mergeSheetMusicPdf(
  inputs: SheetMergeInput[],
): Promise<Uint8Array> {
  if (inputs.length === 0) {
    throw new Error('没有可合并的歌谱')
  }

  const merged = await PDFDocument.create()

  for (const input of inputs) {
    if (input.mimeType === 'application/pdf') {
      const source = await PDFDocument.load(input.bytes, { ignoreEncryption: true })
      const copied = await merged.copyPages(source, source.getPageIndices())
      for (const page of copied) {
        merged.addPage(page)
      }
      continue
    }

    if (
      input.mimeType === 'image/jpeg' ||
      input.mimeType === 'image/png' ||
      input.mimeType === 'image/gif' ||
      input.mimeType === 'image/webp'
    ) {
      await embedImagePage(merged, input.bytes, input.mimeType)
      continue
    }

    throw new Error(`不支持的歌谱格式：${input.title}`)
  }

  return merged.save()
}
