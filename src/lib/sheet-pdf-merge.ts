import { PDFDocument, PageSizes } from 'pdf-lib'
import sharp from 'sharp'
import { getSongSheetPaths, type SongSheetSource } from '@/lib/song-sheet-paths'

export type SheetMergeInput = {
  title: string
  sheetPath: string
  bytes: Buffer
  mimeType: string
}

export type SheetMergeResult = {
  pdf: Uint8Array
  failedTitles: string[]
}

export function findSongsWithoutSheet(
  songs: ({ title: string } & SongSheetSource)[],
): string[] {
  return songs.filter((song) => getSongSheetPaths(song).length === 0).map((song) => song.title)
}

export function filterSongsWithSheet<T extends SongSheetSource>(songs: T[]): T[] {
  return songs.filter((song) => getSongSheetPaths(song).length > 0)
}

function isPdfBytes(bytes: Buffer): boolean {
  return bytes.length >= 4 && bytes.subarray(0, 4).toString('utf8') === '%PDF'
}

async function embedImagePage(pdf: PDFDocument, bytes: Buffer): Promise<void> {
  const pngBytes = await sharp(bytes, { failOn: 'none' }).png().toBuffer()
  const page = pdf.addPage(PageSizes.A4)
  const { width, height } = page.getSize()
  const image = await pdf.embedPng(pngBytes)

  const scale = Math.min(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  const x = (width - drawWidth) / 2
  const y = (height - drawHeight) / 2

  page.drawImage(image, { x, y, width: drawWidth, height: drawHeight })
}

async function appendSheetToPdf(
  merged: PDFDocument,
  input: SheetMergeInput,
): Promise<void> {
  if (input.mimeType === 'application/pdf' || isPdfBytes(input.bytes)) {
    const source = await PDFDocument.load(input.bytes, { ignoreEncryption: true })
    const copied = await merged.copyPages(source, source.getPageIndices())
    for (const page of copied) {
      merged.addPage(page)
    }
    return
  }

  if (
    input.mimeType === 'image/jpeg' ||
    input.mimeType === 'image/png' ||
    input.mimeType === 'image/gif' ||
    input.mimeType === 'image/webp' ||
    input.mimeType.startsWith('image/')
  ) {
    await embedImagePage(merged, input.bytes)
    return
  }

  throw new Error(`不支持的歌谱格式：${input.title}`)
}

export async function mergeSheetMusicPdf(
  inputs: SheetMergeInput[],
): Promise<Uint8Array> {
  const result = await mergeSheetMusicPdfDetailed(inputs)
  return result.pdf
}

export async function mergeSheetMusicPdfDetailed(
  inputs: SheetMergeInput[],
): Promise<SheetMergeResult> {
  if (inputs.length === 0) {
    throw new Error('没有可合并的歌谱')
  }

  const merged = await PDFDocument.create()
  const failedTitles: string[] = []

  for (const input of inputs) {
    try {
      await appendSheetToPdf(merged, input)
    } catch (error) {
      console.error(`Sheet merge failed for ${input.title}:`, error)
      failedTitles.push(input.title)
    }
  }

  if (merged.getPageCount() === 0) {
    throw new Error('没有可合并的歌谱')
  }

  return { pdf: await merged.save(), failedTitles }
}
